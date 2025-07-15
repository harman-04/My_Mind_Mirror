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

# Import common utilities
from modules.common.utils import call_gemini_api, preprocess_text_nltk, sentence_model, sentiment_analyzer, stop_words, lemmatizer

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from config import Config

# Import KMeans here as it's used in train_and_save_clustering_model
from sklearn.cluster import KMeans

logger = logging.getLogger(__name__)

journal_bp = Blueprint('journal', __name__, url_prefix='/ml/journal')

# --- Gemini-Powered AI Functions ---
def get_gemini_emotions(journal_text):
    prompt = f"""Analyze the following journal entry and identify the primary emotions expressed.
    For each emotion, provide a score indicating its intensity from 0.0 to 1.0.
    Focus on common emotions like joy, sadness, anger, fear, surprise, disgust, love, anxiety, relief, neutral, excitement, contentment, frustration, gratitude, hope.
    Provide the emotions as a JSON object where keys are emotion labels and values are their scores.
    Ensure scores sum up to 1.0 if possible, or represent relative intensity.
    The output MUST be a valid JSON object.

    Journal Entry: "{journal_text}"

    JSON Object of Emotions:"""

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "joy": {"type": "NUMBER"}, "sadness": {"type": "NUMBER"}, "anger": {"type": "NUMBER"},
            "fear": {"type": "NUMBER"}, "surprise": {"type": "NUMBER"}, "disgust": {"type": "NUMBER"},
            "love": {"type": "NUMBER"}, "anxiety": {"type": "NUMBER"}, "relief": {"type": "NUMBER"},
            "neutral": {"type": "NUMBER"}, "excitement": {"type": "NUMBER"}, "contentment": {"type": "NUMBER"},
            "frustration": {"type": "NUMBER"}, "gratitude": {"type": "NUMBER"}, "hope": {"type": "NUMBER"}
        },
    }
    emotions = call_gemini_api(prompt, response_schema)
    if emotions is None: logger.warning("Gemini failed to extract emotions. Returning empty dict."); return {}
    processed_emotions = {}
    for emotion, score in emotions.items():
        try: processed_emotions[emotion] = float(score)
        except (ValueError, TypeError): logger.warning(f"Invalid score for emotion '{emotion}': {score}. Skipping."); continue
    total_score = sum(processed_emotions.values())
    if total_score > 0 and abs(total_score - 1.0) > 0.01:
        logger.info(f"Normalizing emotion scores (sum was {total_score:.2f}).")
        normalized_emotions = {k: v / total_score for k, v in processed_emotions.items()}
        return normalized_emotions
    return processed_emotions

def get_gemini_core_concerns(journal_text):
    prompt = f"""Analyze the following journal entry and identify the main themes or core concerns discussed.
    Provide the concerns as a JSON array of strings. Each string should be a concise category.
    Examples of categories: "work", "relationships", "health", "financial", "personal growth", "stress/anxiety", "positive experience", "education", "hobbies".
    The output MUST be a valid JSON array.

    Journal Entry: "{journal_text}"

    JSON Array of Concerns:"""
    response_schema = {"type": "ARRAY", "items": { "type": "STRING" }}
    concerns = call_gemini_api(prompt, response_schema)
    if concerns is None: logger.warning("Gemini failed to extract core concerns. Returning empty list."); return []
    return concerns

def get_gemini_growth_tips(journal_text, emotions, core_concerns):
    emotions_str = ", ".join([f"{label} ({score:.2f})" for label, score in emotions.items()])
    concerns_str = ", ".join(core_concerns) if core_concerns else "No specific concerns identified."
    prompt = f"""Based on the following journal entry, detected emotions, and core concerns,
    generate 3-5 concise, empathetic, and actionable growth tips.
    Provide the tips as a JSON array of strings.
    The output MUST be a valid JSON array.

    Journal Entry: "{journal_text}"
    Detected Emotions: {emotions_str}
    Core Concerns: {concerns_str}

    JSON Array of Growth Tips:"""
    response_schema = {"type": "ARRAY", "items": { "type": "STRING" }}
    tips = call_gemini_api(prompt, response_schema)
    if tips is None: logger.warning("Gemini failed to generate growth tips. Returning empty list."); return ["Keep reflecting on your thoughts and feelings. You're doing great by journaling!"]
    return tips

def get_gemini_summary(journal_text):
    prompt = f"""Summarize the following journal entry concisely, in 1-3 sentences.
    Focus on the main points and overall sentiment.

    Journal Entry: "{journal_text}"

    Summary:"""
    summary = call_gemini_api(prompt)
    if summary is None: logger.warning("Gemini failed to generate summary. Returning truncated raw text."); return journal_text[:150] + "..." if len(journal_text) > 150 else journal_text
    return summary

def get_gemini_key_phrases(journal_text):
    prompt = f"""Extract 5-10 concise key phrases from the following journal entry.
    Provide the key phrases as a JSON array of strings.

    Journal Entry: "{journal_text}"

    JSON Array of Key Phrases:"""
    response_schema = {"type": "ARRAY", "items": { "type": "STRING" }}
    key_phrases = call_gemini_api(prompt, response_schema)
    if key_phrases is None: logger.warning("Gemini failed to extract key phrases. Returning empty list."); return []
    return key_phrases

# --- Journal AI Endpoints ---
@journal_bp.route('/analyze_journal', methods=['POST'])
def analyze_journal():
    data = request.json
    journal_text = data.get('text', '')

    if not journal_text:
        return jsonify({"error": "No text provided"}), 400

    response_data = {
        "moodScore": 0.0,
        "emotions": {},
        "coreConcerns": [],
        "summary": "",
        "growthTips": [],
        "keyPhrases": []
    }

    # 1. Emotion Recognition (Gemini AI)
    response_data["emotions"] = get_gemini_emotions(journal_text)
    
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

    # 3. Core Concerns (Gemini AI)
    response_data["coreConcerns"] = get_gemini_core_concerns(journal_text)

    # 4. Summarization (Gemini AI)
    response_data["summary"] = get_gemini_summary(journal_text)

    # 5. Growth Tips (Gemini AI)
    response_data["growthTips"] = get_gemini_growth_tips(
        journal_text, 
        response_data["emotions"],
        response_data["coreConcerns"]
    )

    # 6. Key Phrases (Gemini AI)
    response_data["keyPhrases"] = get_gemini_key_phrases(journal_text)

    return jsonify(response_data)

# --- Anomaly Detection Function ---
def detect_anomalies(daily_data_list):
    if len(daily_data_list) < 7:
        return {"anomalies": [], "message": "Not enough data for anomaly detection (need at least 7 days)."}
    
    df = pd.DataFrame(daily_data_list)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by='date').set_index('date')
    
    window_size = 7
    
    df['mood_mean'] = df['averageMood'].rolling(window=window_size, min_periods=1).mean()
    df['mood_std'] = df['averageMood'].rolling(window=window_size, min_periods=1).std()
    df['words_mean'] = df['totalWords'].rolling(window=window_size, min_periods=1).mean()
    df['words_std'] = df['totalWords'].rolling(window=window_size, min_periods=1).std()
    
    mood_threshold_std = 1.0
    words_threshold_std = 1.5
    
    anomalies = []
    for i in range(len(df)):
        current_day = df.iloc[i]
        
        if pd.isna(current_day['averageMood']) or pd.isna(current_day['totalWords']) or \
           pd.isna(current_day['mood_mean']) or pd.isna(current_day['mood_std']) or \
           pd.isna(current_day['words_mean']) or pd.isna(current_day['words_std']):
            logger.debug(f"Skipping anomaly check for {current_day.name.strftime('%Y-%m-%d')} due to NaN values.")
            continue
        
        is_mood_anomaly = False
        mood_deviation = None
        if current_day['mood_std'] > 0:
            z_score_mood = (current_day['averageMood'] - current_day['mood_mean']) / current_day['mood_std']
            if abs(z_score_mood) > mood_threshold_std:
                is_mood_anomaly = True
                mood_deviation = "significantly " + ("lower" if z_score_mood < 0 else "higher")
            logger.debug(f"Mood for {current_day.name.strftime('%Y-%m-%d')}: Avg={current_day['averageMood']:.2f}, Mean={current_day['mood_mean']:.2f}, Std={current_day['mood_std']:.2f}, Z-score={z_score_mood:.2f}")

        is_words_anomaly = False
        words_deviation = None
        if current_day['words_std'] > 0:
            z_score_words = (current_day['totalWords'] - current_day['words_mean']) / current_day['words_std']
            if abs(z_score_words) > words_threshold_std:
                is_words_anomaly = True
                words_deviation = "much " + ("less" if z_score_words < 0 else "more")
            logger.debug(f"Words for {current_day.name.strftime('%Y-%m-%d')}: Total={current_day['totalWords']}, Mean={current_day['words_mean']:.2f}, Std={current_day['words_std']:.2f}, Z-score={z_score_words:.2f}")

        if is_mood_anomaly or is_words_anomaly:
            anomaly_details = {
                "date": current_day.name.strftime('%Y-%m-%d'),
                "type": [],
                "message": ""
            }
            if is_mood_anomaly:
                anomaly_details["type"].append("mood")
                anomaly_details["message"] += f"Your average mood was {mood_deviation} than usual. "
            if is_words_anomaly:
                anomaly_details["type"].append("words")
                anomaly_details["message"] += f"You wrote {words_deviation} than usual. "
            anomalies.append(anomaly_details)
            logger.info(f"Anomaly detected for {anomaly_details['date']}: {anomaly_details['message']}")
    
    if anomalies:
        return {"anomalies": anomalies, "message": f"Detected {len(anomalies)} unusual journaling patterns."}
    else:
        return {"anomalies": [], "message": "No significant anomalies detected in your recent journaling patterns."}

@journal_bp.route('/anomaly_detection', methods=['POST'])
def anomaly_detection_endpoint():
    data = request.json
    if not data: return jsonify({"error": "No daily aggregated data provided for anomaly detection"}), 400
    try:
        results = detect_anomalies(data)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error during anomaly detection: {e}", exc_info=True)
        return jsonify({"error": "Failed to perform anomaly detection."}), 500


# --- Journal Clustering Module Functions ---
def train_and_save_clustering_model(user_id, journal_texts, n_clusters): # Removed default value here, it's handled in endpoint
    logger.info(f"train_and_save_clustering_model received n_clusters: {n_clusters}") # Existing log

    if not journal_texts:
        logger.warning(f"No journal texts provided for user {user_id} to train clustering model.")
        return None

    if sentence_model is None:
        logger.error("Sentence Transformer model not loaded. Cannot perform semantic clustering.")
        return None

    logger.info(f"Training clustering model for user {user_id} with {len(journal_texts)} entries using Sentence Transformers.")
    
    embeddings = sentence_model.encode(journal_texts, show_progress_bar=False)

    # Ensure n_clusters is an integer before min() operation
    # This block is now redundant here if handled correctly in the endpoint,
    # but keeping it for robustness in case this function is called directly.
    try:
        n_clusters_int = int(n_clusters)
    except (ValueError, TypeError):
        logger.error(f"train_and_save_clustering_model received invalid n_clusters value: {n_clusters}. Defaulting to 5.")
        n_clusters_int = 5 # Fallback to 5 if it's not a valid integer

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
    # Use kmeans_model.labels_ directly as it's from the training data
    for i, text in enumerate(journal_texts):
        if i < len(kmeans_model.labels_): # Check bounds
            cluster_id = kmeans_model.labels_[i]
            clusters_data[cluster_id].append(text)
        else:
            logger.warning(f"Text index {i} out of bounds for kmeans_model.labels_ (length {len(kmeans_model.labels_)}). Skipping text for keyword extraction.")

    from sklearn.feature_extraction.text import TfidfVectorizer
    
    for cluster_id, texts_in_cluster in clusters_data.items():
        # Initialize a default theme name for this cluster
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
                # Fallback to common words from raw texts if TF-IDF cannot be applied
                all_words_in_cluster = ' '.join(texts_in_cluster).lower()
                all_words_in_cluster = re.sub(r'[^a-z\s]', '', all_words_in_cluster)
                words_freq = [word for word in all_words_in_cluster.split() if word not in stop_words]
                
                if words_freq:
                    top_keywords = [word for word, count in Counter(words_freq).most_common(num_keywords)]
                    if top_keywords:
                        current_theme_name = ", ".join(top_keywords[:2]) # Take top 2 for conciseness
                        if len(top_keywords) > 2:
                            current_theme_name += "..."
                    else:
                        current_theme_name = f"General Theme {cluster_id+1}" # Fallback if no words found
                else:
                    current_theme_name = f"General Theme {cluster_id+1}" # Default if absolutely no words are found
                
                cluster_themes[f"Theme {cluster_id+1}"] = current_theme_name
                continue # Skip to next cluster as TF-IDF failed

            tfidf_matrix_cluster = tfidf_vectorizer_cluster.fit_transform(non_empty_preprocessed_texts)
            feature_names = tfidf_vectorizer_cluster.get_feature_names_out()
            
            cluster_tfidf_sum_flat = tfidf_matrix_cluster.sum(axis=0).A.flatten()

            if feature_names.size > 0:
                top_feature_indices = cluster_tfidf_sum_flat.argsort()[::-1] 
                pos_tagged_keywords = nltk.pos_tag(feature_names[top_feature_indices].tolist())
                descriptive_keywords = [
                    word for word, tag in pos_tagged_keywords 
                    if tag.startswith('N') or tag.startswith('J') # Nouns (NN, NNS, NNP, NNPS) or Adjectives (JJ, JJR, JJS)
                    and word not in stop_words
                ][:num_keywords]
                
                if descriptive_keywords:
                    current_theme_name = ", ".join(descriptive_keywords[:2]) # Take top 2 for conciseness
                    if len(descriptive_keywords) > 2:
                        current_theme_name += "..." # Indicate more keywords if available
                else:
                    current_theme_name = f"General Theme {cluster_id+1}" # Fallback if no descriptive keywords found

                cluster_themes[f"Theme {cluster_id+1}"] = current_theme_name # Store as a single string
            else:
                cluster_themes[f"Theme {cluster_id+1}"] = f"General Theme {cluster_id+1}" # No features, use generic


        except Exception as e: # Catch any other unexpected errors during TF-IDF or keyword extraction
            cluster_themes[f"Theme {cluster_id+1}"] = f"Error Theme {cluster_id+1}" # Fallback on error
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
    
    # ⭐ NEW LOG: Print the entire raw data dictionary ⭐
    logger.info(f"cluster_journal_entries_endpoint received raw data: {data}") 

    # Retrieve n_clusters from request. Use None as default to differentiate from 0 or 5.
    n_clusters_from_request = data.get('nClusters') 

    # Explicitly convert to int and handle potential errors or None
    n_clusters = 5 # Default fallback
    if n_clusters_from_request is not None:
        try:
            n_clusters = int(n_clusters_from_request)
            logger.info(f"Successfully parsed n_clusters from request: {n_clusters}")
        except (ValueError, TypeError):
            logger.error(f"Invalid n_clusters value received: {n_clusters_from_request}. Defaulting to 5.")
            n_clusters = 5 # Fallback if conversion fails
    else:
        logger.warning("nClusters not found in request data. Defaulting to 5.")


    logger.info(f"cluster_journal_entries_endpoint final n_clusters value: {n_clusters}") # Updated log

    if not user_id or not journal_texts: 
        logger.error("User ID or journal texts missing for clustering request.")
        return jsonify({"error": "User ID and journal texts are required for clustering."}), 400

    if len(journal_texts) < 2: # Need at least 2 entries for meaningful clustering
        logger.warning(f"Not enough journal entries ({len(journal_texts)}) for clustering. Need at least 2.")
        return jsonify({"error": "You need at least 2 journal entries to perform clustering."}), 400
    
    # Ensure n_clusters is not more than available entries, and at least 2 for >1 cluster
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
        # Pass the correctly retrieved n_clusters to the training function
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
