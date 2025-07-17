# D:\new ai\My_Mind_Mirror\ml-service\modules\journal\routes.py

import os
import logging
import pandas as pd
import numpy as np
import joblib
from collections import defaultdict, Counter
import re
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import nltk

# Import common utilities - ensure these are correctly sourced from your utils.py
from modules.common.utils import call_gemini_api, preprocess_text_nltk, sentence_model, stop_words, lemmatizer 

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from config import Config

# Import KMeans here as it's used in train_and_save_clustering_model
from sklearn.cluster import KMeans

logger = logging.getLogger(__name__)

journal_bp = Blueprint('journal', __name__, url_prefix='/ml/journal')

# --- Optimized Unified Gemini AI Function ---
def get_gemini_journal_analysis(journal_text):
    """
    Makes a single, comprehensive call to the Gemini API to get all required
    journal analysis components (emotions, concerns, summary, growth tips, key phrases).
    """
    prompt = f"""Analyze the following journal entry and provide the following information as a single JSON object:
    1.  **Emotions**: Identify primary emotions with intensity scores from 0.0 to 1.0. Focus on common emotions like joy, sadness, anger, fear, surprise, disgust, love, anxiety, relief, neutral, excitement, contentment, frustration, gratitude, hope. Ensure scores sum up to 1.0 if possible, or represent relative intensity.
    2.  **Core Concerns**: Identify 3-5 main themes or core concerns discussed, as a list of concise strings (e.g., "work", "relationships", "health", "personal growth").
    3.  **Summary**: Summarize the journal entry concisely, in 1-3 sentences, focusing on the main points and overall sentiment.
    4.  **Growth Tips**: Generate 3-5 concise, empathetic, and actionable growth tips based on the entry's detected emotions and core concerns.
    5.  **Key Phrases**: Extract 5-10 concise key phrases from the entry.

    The output MUST be a valid JSON object with the exact following structure. If a field cannot be determined, provide an empty list for arrays, an empty string for strings, or an empty object for emotion scores.
    {{
        "emotions": {{
            "joy": 0.X,
            "sadness": 0.Y,
            "anger": 0.Z,
            "fear": 0.A,
            "surprise": 0.B,
            "disgust": 0.C,
            "love": 0.D,
            "anxiety": 0.E,
            "relief": 0.F,
            "neutral": 0.G,
            "excitement": 0.H,
            "contentment": 0.I,
            "frustration": 0.J,
            "gratitude": 0.K,
            "hope": 0.L
        }},
        "coreConcerns": ["concern1", "concern2", "concern3"],
        "summary": "This is a concise summary of the journal entry.",
        "growthTips": ["Tip 1.", "Tip 2.", "Tip 3."],
        "keyPhrases": ["phrase1", "phrase2", "phrase3"]
    }}

    Journal Entry: "{journal_text}"

    JSON Analysis:"""

    # Define a comprehensive response schema
    # While the Gemini API via direct requests.post doesn't use this directly
    # for schema validation, it serves as excellent documentation for the expected structure
    # and reinforces it in the prompt.
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "emotions": {
                "type": "OBJECT",
                "properties": {
                    "joy": {"type": "number"}, "sadness": {"type": "number"}, "anger": {"type": "number"},
                    "fear": {"type": "number"}, "surprise": {"type": "number"}, "disgust": {"type": "number"},
                    "love": {"type": "number"}, "anxiety": {"type": "number"}, "relief": {"type": "number"},
                    "neutral": {"type": "number"}, "excitement": {"type": "number"}, "contentment": {"type": "number"},
                    "frustration": {"type": "number"}, "gratitude": {"type": "number"}, "hope": {"type": "number"}
                },
                "additionalProperties": True # Allow other emotions if Gemini decides to add them
            },
            "coreConcerns": {"type": "array", "items": {"type": "string"}},
            "summary": {"type": "string"},
            "growthTips": {"type": "array", "items": {"type": "string"}},
            "keyPhrases": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["emotions", "coreConcerns", "summary", "growthTips", "keyPhrases"]
    }

    # Call the now-compatible call_gemini_api
    full_analysis = call_gemini_api(
        prompt,
        response_schema=response_schema, # Pass the schema for documentation/guidance
        temperature=0.7, # Use a slightly higher temperature for more creative tips/phrases
        timeout=60       # Give it more time for a complex response
    )

    if full_analysis is None:
        logger.warning("Gemini failed to generate a full journal analysis. Returning empty/default values.")
        return {
            "emotions": {},
            "coreConcerns": [],
            "summary": journal_text[:150] + "..." if len(journal_text) > 150 else journal_text,
            "growthTips": ["Keep reflecting on your thoughts and feelings. You're doing great by journaling!"],
            "keyPhrases": []
        }

    # Post-process emotions: ensure float type and normalization
    processed_emotions = {}
    raw_emotions = full_analysis.get("emotions", {})
    for emotion, score in raw_emotions.items():
        try:
            # Ensure score is a number, not a string or other type
            processed_emotions[emotion] = float(score)
        except (ValueError, TypeError):
            logger.warning(f"Invalid score for emotion '{emotion}': {score}. Skipping. Defaulting to 0.0.")
            processed_emotions[emotion] = 0.0
    
    total_score = sum(processed_emotions.values())
    if total_score > 0 and abs(total_score - 1.0) > 0.01:
        logger.info(f"Normalizing emotion scores (sum was {total_score:.2f}).")
        normalized_emotions = {k: v / total_score for k, v in processed_emotions.items()}
        full_analysis["emotions"] = normalized_emotions
    else:
        full_analysis["emotions"] = processed_emotions # Use as is if sum is fine or zero

    # Ensure other fields are lists/strings if Gemini somehow returns None or wrong type
    full_analysis["coreConcerns"] = full_analysis.get("coreConcerns", [])
    if not isinstance(full_analysis["coreConcerns"], list):
        logger.warning(f"coreConcerns not a list. Resetting. Value: {full_analysis['coreConcerns']}")
        full_analysis["coreConcerns"] = []
    
    full_analysis["growthTips"] = full_analysis.get("growthTips", [])
    if not isinstance(full_analysis["growthTips"], list):
        logger.warning(f"growthTips not a list. Resetting. Value: {full_analysis['growthTips']}")
        full_analysis["growthTips"] = ["Keep reflecting on your thoughts and feelings. You're doing great by journaling!"]

    full_analysis["keyPhrases"] = full_analysis.get("keyPhrases", [])
    if not isinstance(full_analysis["keyPhrases"], list):
        logger.warning(f"keyPhrases not a list. Resetting. Value: {full_analysis['keyPhrases']}")
        full_analysis["keyPhrases"] = []
    
    full_analysis["summary"] = full_analysis.get("summary", journal_text[:150] + "..." if len(journal_text) > 150 else journal_text)
    if not isinstance(full_analysis["summary"], str):
        logger.warning(f"summary not a string. Resetting. Value: {full_analysis['summary']}")
        full_analysis["summary"] = journal_text[:150] + "..." if len(journal_text) > 150 else journal_text

    return full_analysis


# --- Journal AI Endpoints ---
@journal_bp.route('/analyze_journal', methods=['POST'])
def analyze_journal():
    data = request.json
    journal_text = data.get('text', '')

    if not journal_text:
        return jsonify({"error": "No text provided"}), 400

    # Call the new unified function
    ai_analysis_results = get_gemini_journal_analysis(journal_text)

    response_data = {
        "moodScore": 0.0, # Will be calculated below
        "emotions": ai_analysis_results.get("emotions", {}),
        "coreConcerns": ai_analysis_results.get("coreConcerns", []),
        "summary": ai_analysis_results.get("summary", ""),
        "growthTips": ai_analysis_results.get("growthTips", []),
        "keyPhrases": ai_analysis_results.get("keyPhrases", [])
    }

    # 2. Mood Score (Derived from Emotion Recognition)
    emotion_weights = {
        'joy': 1.0, 'love': 1.0, 'surprise': 0.5, 'amusement': 0.5, 'excitement': 0.8,
        'sadness': -1.0, 'anger': -0.8, 'fear': -0.7, 'disappointment': -0.6, 'grief': -1.0,
        'neutral': 0.0, 'optimism': 0.7, 'relief': 0.4, 'caring': 0.6, 'curiosity': 0.3,
        'embarrassment': -0.4, 'pride': 0.5, 'remorse': -0.5, 'annoyance': -0.3, 'disgust': -0.6,
        'stress': -0.7,
        'frustration': -0.5,
        'gratitude': 0.9,
        'hope': 0.8
    }
    
    calculated_mood_score = 0.0
    total_emotion_score = 0.0
    
    if response_data["emotions"]:
        for emotion, score in response_data["emotions"].items():
            weight = emotion_weights.get(emotion.lower(), 0.0)
            calculated_mood_score += score * weight
            total_emotion_score += score

    if total_emotion_score > 0:
        response_data["moodScore"] = calculated_mood_score / total_emotion_score
    else:
        response_data["moodScore"] = 0.0

    logger.info(f"Journal analysis completed for entry. Mood Score: {response_data['moodScore']:.2f}")
    return jsonify(response_data)

# --- Anomaly Detection Function (Advanced with EWMA) ---
def detect_anomalies(daily_data_list):
    """
    Detects anomalies in daily mood and word count data using Exponentially Weighted Moving Averages (EWMA).

    Anomalies are identified when a daily value deviates significantly from its
    recent EWMA mean, based on EWMA standard deviation.

    Args:
        daily_data_list (list of dict): A list of dictionaries, where each dictionary
                                        represents a day's aggregated data.
                                        Expected keys: 'date' (str, 'YYYY-MM-DD'),
                                        'averageMood' (float), 'totalWords' (int).

    Returns:
        dict: A dictionary containing:
              - "anomalies" (list): A list of detected anomaly dictionaries.
                                    Each anomaly dict includes "date", "type" (list of affected metrics),
                                    and a detailed "message".
              - "message" (str): An overall message about the detection results.
    """
    if not daily_data_list:
        return {"anomalies": [], "message": "No data provided for anomaly detection."}

    # Convert to DataFrame
    df = pd.DataFrame(daily_data_list)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by='date').set_index('date')

    # Ensure numeric types and handle potential NaNs from missing days
    df['averageMood'] = pd.to_numeric(df['averageMood'], errors='coerce')
    df['totalWords'] = pd.to_numeric(df['totalWords'], errors='coerce')

    # Parameters for EWMA
    # span is roughly equivalent to a window size, but gives more weight to recent data
    ewma_span = 7 # Equivalent to a 7-day half-life, giving more weight to recent days
    
    # Calculate EWMA mean and standard deviation for mood and words
    df['mood_ewma_mean'] = df['averageMood'].ewm(span=ewma_span, adjust=False, min_periods=1).mean()
    df['mood_ewma_std'] = df['averageMood'].ewm(span=ewma_span, adjust=False, min_periods=1).std()
    df['words_ewma_mean'] = df['totalWords'].ewm(span=ewma_span, adjust=False, min_periods=1).mean()
    df['words_ewma_std'] = df['totalWords'].ewm(span=ewma_span, adjust=False, min_periods=1).std()

    # Anomaly thresholds (in terms of standard deviations from EWMA mean)
    # Mood might be more sensitive, word count can have larger natural fluctuations
    mood_threshold_std = 0.8 # Increased sensitivity slightly from 1.0
    words_threshold_std = 1. # Increased sensitivity from 1.5

    anomalies = []

    # Iterate through the DataFrame to detect anomalies
    # Start from `ewma_span - 1` to ensure enough data points for a stable EWMA calculation
    # or from `min_periods - 1` if min_periods is smaller
    start_idx = ewma_span - 1 if len(df) >= ewma_span else 0 # Start from where EWMA is more stable

    for i in range(start_idx, len(df)):
        current_day = df.iloc[i]
        current_date_str = current_day.name.strftime('%Y-%m-%d')

        # Skip anomaly check if critical EWMA values are NaN (e.g., at very beginning of data)
        if pd.isna(current_day['averageMood']) or pd.isna(current_day['totalWords']) or \
           pd.isna(current_day['mood_ewma_mean']) or pd.isna(current_day['mood_ewma_std']) or \
           pd.isna(current_day['words_ewma_mean']) or pd.isna(current_day['words_ewma_std']):
            logger.debug(f"Skipping anomaly check for {current_date_str} due to insufficient EWMA data or missing daily values.")
            continue

        is_mood_anomaly = False
        mood_deviation_msg = ""
        
        # Check mood anomaly
        if current_day['mood_ewma_std'] > 0: # Avoid division by zero if std is 0
            z_score_mood = (current_day['averageMood'] - current_day['mood_ewma_mean']) / current_day['mood_ewma_std']
            if abs(z_score_mood) > mood_threshold_std:
                is_mood_anomaly = True
                deviation_direction = "lower" if z_score_mood < 0 else "higher"
                mood_deviation_msg = (
                    f"Your average mood ({current_day['averageMood']:.2f}) was significantly {deviation_direction} "
                    f"than your recent typical mood ({current_day['mood_ewma_mean']:.2f} ± {mood_threshold_std * current_day['mood_ewma_std']:.2f})."
                )
            logger.debug(f"Mood for {current_date_str}: Avg={current_day['averageMood']:.2f}, EWMA Mean={current_day['mood_ewma_mean']:.2f}, EWMA Std={current_day['mood_ewma_std']:.2f}, Z-score={z_score_mood:.2f}")
        elif current_day['averageMood'] != current_day['mood_ewma_mean']: # If std is 0 but mood deviates (e.g., constant mood then sudden change)
             is_mood_anomaly = True
             deviation_direction = "lower" if current_day['averageMood'] < current_day['mood_ewma_mean'] else "higher"
             mood_deviation_msg = (
                 f"Your average mood ({current_day['averageMood']:.2f}) was significantly {deviation_direction} "
                 f"than your recent constant mood ({current_day['mood_ewma_mean']:.2f})."
             )


        is_words_anomaly = False
        words_deviation_msg = ""
        
        # Check words anomaly
        if current_day['words_ewma_std'] > 0: # Avoid division by zero if std is 0
            z_score_words = (current_day['totalWords'] - current_day['words_ewma_mean']) / current_day['words_ewma_std']
            if abs(z_score_words) > words_threshold_std:
                is_words_anomaly = True
                deviation_direction = "less" if z_score_words < 0 else "more"
                words_deviation_msg = (
                    f"You wrote {current_day['totalWords']} words, which is {deviation_direction} "
                    f"than your recent typical word count ({current_day['words_ewma_mean']:.2f} ± {words_threshold_std * current_day['words_ewma_std']:.2f})."
                )
            logger.debug(f"Words for {current_date_str}: Total={current_day['totalWords']}, EWMA Mean={current_day['words_ewma_mean']:.2f}, EWMA Std={current_day['words_ewma_std']:.2f}, Z-score={z_score_words:.2f}")
        elif current_day['totalWords'] != current_day['words_ewma_mean']: # If std is 0 but words deviate
            is_words_anomaly = True
            deviation_direction = "less" if current_day['totalWords'] < current_day['words_ewma_mean'] else "more"
            words_deviation_msg = (
                f"You wrote {current_day['totalWords']} words, which is {deviation_direction} "
                f"than your recent constant word count ({current_day['words_ewma_mean']:.2f})."
            )


        if is_mood_anomaly or is_words_anomaly:
            anomaly_details = {
                "date": current_date_str,
                "type": [],
                "message": ""
            }
            if is_mood_anomaly:
                anomaly_details["type"].append("mood")
                anomaly_details["message"] += mood_deviation_msg + " "
            if is_words_anomaly:
                anomaly_details["type"].append("words")
                anomaly_details["message"] += words_deviation_msg + " "
            
            anomalies.append(anomaly_details)
            logger.info(f"Anomaly detected for {anomaly_details['date']}: {anomaly_details['message']}")
    
    if anomalies:
        return {"anomalies": anomalies, "message": f"Detected {len(anomalies)} unusual journaling patterns."}
    else:
        return {"anomalies": [], "message": "No significant anomalies detected in your recent journaling patterns."}

# --- Anomaly Detection Endpoint ---
@journal_bp.route('/anomaly_detection', methods=['POST']) # ⭐ THIS IS THE UNCOMMENTED ENDPOINT ⭐
@cross_origin() # Add cross_origin decorator if not already handled globally
def anomaly_detection_endpoint():
    if request.method == 'OPTIONS':
        return '', 200 # Handle CORS preflight requests

    data = request.json
    if not data:
        return jsonify({"error": "No daily aggregated data provided for anomaly detection"}), 400
    try:
        results = detect_anomalies(data)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error during anomaly detection: {e}", exc_info=True)
        return jsonify({"error": "Failed to perform anomaly detection."}), 500

# --- Journal Clustering Module Functions ---
def train_and_save_clustering_model(user_id, journal_texts, n_clusters):
    logger.info(f"train_and_save_clustering_model received n_clusters: {n_clusters}")

    if not journal_texts:
        logger.warning(f"No journal texts provided for user {user_id} to train clustering model.")
        return None

    if sentence_model is None:
        logger.error("Sentence Transformer model not loaded. Cannot perform semantic clustering.")
        return None

    logger.info(f"Training clustering model for user {user_id} with {len(journal_texts)} entries using Sentence Transformers.")
    
    embeddings = sentence_model.encode(journal_texts, show_progress_bar=False)

    try:
        n_clusters_int = int(n_clusters)
    except (ValueError, TypeError):
        logger.error(f"train_and_save_clustering_model received invalid n_clusters value: {n_clusters}. Defaulting to 5.")
        n_clusters_int = 5

    actual_n_clusters = min(n_clusters_int, len(journal_texts))
    if actual_n_clusters <= 1:
        logger.warning(f"Not enough data to form meaningful clusters for user {user_id}. Need at least 2 entries for >1 cluster.")
        return None

    kmeans = KMeans(n_clusters=actual_n_clusters, random_state=42, n_init=10)
    kmeans.fit(embeddings)

    user_model_path = os.path.join(Config.USER_MODELS_DIR, str(user_id))
    os.makedirs(user_model_path, exist_ok=True)
    
    kmeans_path = os.path.join(user_model_path, 'kmeans_model.pkl')
    joblib.dump(kmeans, kmeans_path)
    logger.info(f"KMeans model saved for user {user_id} at {user_model_path}")
    
    return kmeans

def load_clustering_model(user_id):
    """
    Loads a user's trained K-Means clustering model.
    """
    user_model_path = os.path.join(Config.USER_MODELS_DIR, str(user_id))
    kmeans_path = os.path.join(user_model_path, 'kmeans_model.pkl')

    if os.path.exists(kmeans_path):
        logger.info(f"Loading K-Means model for user {user_id}.")
        kmeans_model = joblib.load(kmeans_path)
        return kmeans_model
    else:
        logger.info(f"No K-Means model found for user {user_id}.")
        return None


def get_cluster_keywords_semantic(kmeans_model, journal_texts, num_keywords=5):
    if kmeans_model is None or not journal_texts:
        return {}

    cluster_themes = {}
    
    clusters_data = defaultdict(list)
    for i, text in enumerate(journal_texts):
        if i < len(kmeans_model.labels_):
            cluster_id = kmeans_model.labels_[i]
            clusters_data[cluster_id].append(text)
        else:
            logger.warning(f"Text index {i} out of bounds for kmeans_model.labels_ (length {len(kmeans_model.labels_)}). Skipping text for keyword extraction.")

    from sklearn.feature_extraction.text import TfidfVectorizer
    
    for cluster_id, texts_in_cluster in clusters_data.items():
        current_theme_name = f"General Theme {cluster_id+1}" 

        if not texts_in_cluster:
            cluster_themes[f"Theme {cluster_id+1}"] = "No entries in this theme"
            continue

        preprocessed_cluster_texts = [preprocess_text_nltk(text) for text in texts_in_cluster]
        
        tfidf_vectorizer_cluster = TfidfVectorizer(max_features=100, min_df=1, stop_words='english')
        
        try:
            non_empty_preprocessed_texts = [t for t in preprocessed_cluster_texts if t.strip()]
            
            if not non_empty_preprocessed_texts:
                logger.warning(f"Cluster {cluster_id+1} has no non-empty preprocessed texts. Cannot extract TF-IDF keywords. Falling back to simple word count.")
                all_words_in_cluster = ' '.join(texts_in_cluster).lower()
                all_words_in_cluster = re.sub(r'[^a-z\s]', '', all_words_in_cluster)
                words_freq = [word for word in all_words_in_cluster.split() if word not in stop_words]
                
                if words_freq:
                    top_keywords = [word for word, count in Counter(words_freq).most_common(num_keywords)]
                    if top_keywords:
                        current_theme_name = ", ".join(top_keywords[:2])
                        if len(top_keywords) > 2:
                            current_theme_name += "..."
                
                cluster_themes[f"Theme {cluster_id+1}"] = current_theme_name
                continue 

            tfidf_matrix_cluster = tfidf_vectorizer_cluster.fit_transform(non_empty_preprocessed_texts)
            feature_names = tfidf_vectorizer_cluster.get_feature_names_out()
            
            cluster_tfidf_sum_flat = tfidf_matrix_cluster.sum(axis=0).A.flatten()

            if feature_names.size > 0:
                top_feature_indices = cluster_tfidf_sum_flat.argsort()[::-1] 
                pos_tagged_keywords = nltk.pos_tag(feature_names[top_feature_indices].tolist())
                descriptive_keywords = [
                    word for word, tag in pos_tagged_keywords 
                    if tag.startswith('N') or tag.startswith('J') 
                    and word not in stop_words
                ][:num_keywords]
                
                if descriptive_keywords:
                    current_theme_name = ", ".join(descriptive_keywords[:2])
                    if len(descriptive_keywords) > 2:
                        current_theme_name += "..." 
                
                cluster_themes[f"Theme {cluster_id+1}"] = current_theme_name
            else:
                cluster_themes[f"Theme {cluster_id+1}"] = f"General Theme {cluster_id+1}" 


        except Exception as e:
            cluster_themes[f"Theme {cluster_id+1}"] = f"Error Theme {cluster_id+1}" 
            logger.error(f"An unexpected error occurred during keyword extraction for cluster {cluster_id+1}: {e}", exc_info=True)
            
    return cluster_themes

# --- Journal Clustering Endpoint ---
@journal_bp.route('/cluster_journal_entries', methods=['POST', 'OPTIONS'])
@cross_origin()
def cluster_journal_entries_endpoint():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    user_id = data.get('userId')
    journal_texts = data.get('journalTexts', []) 
    
    logger.info(f"cluster_journal_entries_endpoint received raw data: {data}") 

    n_clusters_from_request = data.get('nClusters') 

    n_clusters = 5 
    if n_clusters_from_request is not None:
        try:
            n_clusters = int(n_clusters_from_request)
            logger.info(f"Successfully parsed n_clusters from request: {n_clusters}")
        except (ValueError, TypeError):
            logger.error(f"Invalid n_clusters value received: {n_clusters_from_request}. Defaulting to 5.")
            n_clusters = 5 
    else:
        logger.warning("nClusters not found in request data. Defaulting to 5.")


    logger.info(f"cluster_journal_entries_endpoint final n_clusters value: {n_clusters}") 

    if not user_id or not journal_texts: 
        logger.error("User ID or journal texts missing for clustering request.")
        return jsonify({"error": "User ID and journal texts are required for clustering."}), 400

    if len(journal_texts) < 2: 
        logger.warning(f"Not enough journal entries ({len(journal_texts)}) for clustering. Need at least 2.")
        return jsonify({"error": "You need at least 2 journal entries to perform clustering."}), 400
    
    actual_n_clusters = min(n_clusters, len(journal_texts))
    if actual_n_clusters <= 1:
        logger.warning(f"Adjusting n_clusters to {actual_n_clusters} as it was too low/high for available entries.")
        response_data = {
            "numClusters": 0,
            "clusterThemes": {},
            "entryClusters": [],
            "message": "Not enough distinct entries or clusters requested to form meaningful themes."
        }
        logger.info(f"Flask returning adjusted clustering response (numClusters <= 1): {response_data}")
        return jsonify(response_data), 200

    if sentence_model is None:
        logger.error("Semantic clustering model not loaded. Cannot perform semantic clustering.")
        return jsonify({"error": "Semantic clustering model not loaded. Please check Flask logs."}), 500

    try:
        kmeans_model = train_and_save_clustering_model(user_id, journal_texts, n_clusters) 
        
        if kmeans_model is None:
            logger.error("train_and_save_clustering_model returned None. Cannot proceed with clustering.")
            return jsonify({"error": "Failed to train clustering model. Check logs for details."}), 500

        embeddings_for_prediction = sentence_model.encode(journal_texts, show_progress_bar=False)
        entry_clusters = kmeans_model.predict(embeddings_for_prediction).tolist()

        cluster_themes = get_cluster_keywords_semantic(kmeans_model, journal_texts)

        response = {
            "numClusters": kmeans_model.n_clusters,
            "clusterThemes": cluster_themes,
            "entryClusters": entry_clusters
        }

        if not cluster_themes or not response.get("clusterThemes"):
            logger.warning("get_cluster_keywords_semantic returned empty themes or themes missing. Providing fallback themes.")
            fallback_themes = {f"Theme {i+1}": f"General Theme {i+1}" for i in range(kmeans_model.n_clusters)}
            response["clusterThemes"] = fallback_themes
            response["message"] = "Clustering successful, but specific themes could not be extracted. Displaying general themes."

        logger.info(f"Clustering completed for user {user_id}. Flask final response: {response}")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error during journal clustering: {e}", exc_info=True)
        return jsonify({"error": "Failed to perform journal clustering due to an unexpected error."}), 500
