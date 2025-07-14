from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS
import os
import logging
import requests
import json
from dotenv import load_dotenv
from collections import defaultdict, Counter
import pandas as pd
import numpy as np
import re
import time # For simulating timestamps

# --- NEW: Sentence Transformers for Semantic Embeddings ---
from sentence_transformers import SentenceTransformer
# --- End New Imports ---

# --- NLTK and Clustering ---
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import joblib
# --- End NLTK and Clustering ---

load_dotenv() # Load environment variables from .env file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app) # Enable CORS for all origins (for development)

os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.")

# Using gemini-2.5-flash as requested by your existing code
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
HEADERS = {'Content-Type': 'application/json'}

# --- Model Storage Directories ---
MODEL_DIR = 'models'
USER_MODELS_DIR = os.path.join(MODEL_DIR, 'user_specific_models')
os.makedirs(USER_MODELS_DIR, exist_ok=True) # Ensure directory exists

logger.info("Loading Hugging Face NLP Models...")

# Hugging Face Sentiment Analyzer (still loaded, but not primary for emotion analysis)
try:
    sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")
    logger.info("✓ Sentiment Analyzer Loaded")
except Exception as e:
    logger.error(f"Failed to load sentiment analyzer: {e}")
    sentiment_analyzer = None

logger.info("Hugging Face models loaded. Ready for Gemini integration.")

# ⭐ NEW: Load Sentence Transformer Model Globally ⭐
# This model is good for general purpose sentence embeddings
try:
    # Using a smaller, faster model for efficiency
    sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("✓ Sentence Transformer Model Loaded: all-MiniLM-L6-v2")
except Exception as e:
    logger.error(f"Failed to load Sentence Transformer model: {e}")
    sentence_model = None


# --- NLTK Data Download and Initialization ---
# ⭐ CRITICAL FIX: Ensure NLTK data is downloaded unconditionally on startup ⭐
# This block will run when the Flask app starts, ensuring resources are available.
try:
    logger.info("Checking and downloading NLTK data...")
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('punkt', quiet=True) # Added punkt, often a dependency
    nltk.download('averaged_perceptron_tagger', quiet=True)
    nltk.download('averaged_perceptron_tagger_eng', quiet=True) # Explicitly download this one
    logger.info("NLTK essential data checked/downloaded successfully.")
except Exception as e:
    logger.error(f"Failed to download NLTK data on startup. Please check your network and permissions. Error: {e}")
    # Consider exiting or raising if NLTK is critical for app function
    # For now, we'll let the app continue, but keyword extraction might fail.

# Initialize NLTK components after ensuring data is downloaded
stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

# --- Text Preprocessing Function (for NLTK-based cleaning) ---
def preprocess_text_nltk(text):
    """
    Cleans and preprocesses text using NLTK for TF-IDF (if used for keywords).
    - Lowercases, removes punctuation/numbers, removes stopwords, lemmatizes.
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    words = [lemmatizer.lemmatize(word) for word in text.split() if word and word not in stop_words]
    return ' '.join(words)

# --- Gemini API Helper Function ---
def call_gemini_api(prompt_text, response_schema=None):
    chat_history = [{"role": "user", "parts": [{"text": prompt_text}]}]
    payload = {"contents": chat_history}

    if response_schema:
        payload["generationConfig"] = {
            "responseMimeType": "application/json",
            "responseSchema": response_schema
        }

    try:
        logger.info("Calling Gemini API...")
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers=HEADERS,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        logger.info("Gemini API call successful.")

        if result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
            response_text = result["candidates"][0]["content"]["parts"][0].get("text", "")
            
            if response_schema: # If a schema was provided, we expect JSON
                json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
                if json_match:
                    parsed_text_content = json_match.group(1)
                    logger.info("Extracted JSON from markdown block.")
                else:
                    parsed_text_content = response_text
                    logger.warning("Gemini response did not contain a JSON markdown block. Attempting to parse as raw JSON.")
                
                try:
                    return json.loads(parsed_text_content)
                except json.JSONDecodeError as e:
                    logger.error("Failed to decode JSON from Gemini response text (with schema): %s. Response text: %s", e, response_text)
                    return None
            else: # If no schema was provided, we expect plain text
                return response_text
        else:
            logger.warning("Gemini API response structure unexpected or content missing: %s", result)
            return None
    except requests.exceptions.RequestException as e:
        logger.error("Gemini API request failed: %s", e)
        if hasattr(e, 'response') and e.response is not None:
            logger.error("Gemini API Error Response Body: %s", e.response.text)
        return None
    except json.JSONDecodeError as e:
        logger.error("Failed to decode JSON from Gemini response: %s", e)
        return None
    except Exception as e:
        logger.error("An unexpected error occurred during Gemini API call: %s", e)
        return None


# --- Gemini-Powered AI Functions (remain the same, as they are for analysis, not clustering input) ---
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


@app.route('/generate_reflection', methods=['POST'])
def generate_reflection():
    data = request.json
    prompt_text = data.get('prompt_text', '')
    if not prompt_text: return jsonify({"error": "No prompt text provided"}), 400
    reflection_text = call_gemini_api(prompt_text)
    if reflection_text: return jsonify({"reflection": reflection_text})
    else: return jsonify({"error": "Failed to generate reflection from AI."}), 500


# --- Anomaly Detection Function (YOUR CUSTOM ML) ---
def detect_anomalies(daily_data_list):
    if len(daily_data_list) < 7:
        return {"anomalies": [], "message": "Not enough data for anomaly detection (need at least 7 days)."}
    
    df = pd.DataFrame(daily_data_list)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by='date').set_index('date')
    
    window_size = 7 # Rolling window for mean and std dev
    
    # Calculate rolling mean and standard deviation, ensuring min_periods for early data points
    df['mood_mean'] = df['averageMood'].rolling(window=window_size, min_periods=1).mean()
    df['mood_std'] = df['averageMood'].rolling(window=window_size, min_periods=1).std()
    df['words_mean'] = df['totalWords'].rolling(window=window_size, min_periods=1).mean()
    df['words_std'] = df['totalWords'].rolling(window=window_size, min_periods=1).std()
    
    # ⭐ ADJUSTED THRESHOLDS for more sensitivity ⭐
    mood_threshold_std = 1.0 # Lowered from 1.5
    words_threshold_std = 1.5 # Lowered from 2.0
    
    anomalies = []
    for i in range(len(df)):
        current_day = df.iloc[i]
        
        # Skip if essential data or rolling stats are NaN
        if pd.isna(current_day['averageMood']) or pd.isna(current_day['totalWords']) or \
           pd.isna(current_day['mood_mean']) or pd.isna(current_day['mood_std']) or \
           pd.isna(current_day['words_mean']) or pd.isna(current_day['words_std']):
            logger.debug(f"Skipping anomaly check for {current_day.name.strftime('%Y-%m-%d')} due to NaN values.")
            continue
        
        is_mood_anomaly = False
        mood_deviation = None
        if current_day['mood_std'] > 0: # Avoid division by zero
            z_score_mood = (current_day['averageMood'] - current_day['mood_mean']) / current_day['mood_std']
            if abs(z_score_mood) > mood_threshold_std:
                is_mood_anomaly = True
                mood_deviation = "significantly " + ("lower" if z_score_mood < 0 else "higher")
            logger.debug(f"Mood for {current_day.name.strftime('%Y-%m-%d')}: Avg={current_day['averageMood']:.2f}, Mean={current_day['mood_mean']:.2f}, Std={current_day['mood_std']:.2f}, Z-score={z_score_mood:.2f}")

        is_words_anomaly = False
        words_deviation = None
        if current_day['words_std'] > 0: # Avoid division by zero
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


# --- NEW ENDPOINT for Anomaly Detection ---
@app.route('/anomaly_detection', methods=['POST'])
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

# ⭐ MODIFIED: train_and_save_clustering_model now takes a list of raw texts ⭐
def train_and_save_clustering_model(user_id, journal_texts, n_clusters=5):
    """
    Trains a Sentence Transformer-based K-Means clustering model for a given user.
    Saves the trained model to a user-specific file.
    Expects a list of raw journal texts.
    """
    if not journal_texts:
        logger.warning(f"No journal texts provided for user {user_id} to train clustering model.")
        return None

    if sentence_model is None:
        logger.error("Sentence Transformer model not loaded. Cannot perform semantic clustering.")
        return None

    logger.info(f"Training clustering model for user {user_id} with {len(journal_texts)} entries using Sentence Transformers.")
    
    embeddings = sentence_model.encode(journal_texts, show_progress_bar=False)

    actual_n_clusters = min(n_clusters, len(journal_texts))
    if actual_n_clusters <= 1:
        logger.warning(f"Not enough data to form meaningful clusters for user {user_id}. Need at least 2 entries for >1 cluster.")
        return None

    kmeans = KMeans(n_clusters=actual_n_clusters, random_state=42, n_init=10)
    kmeans.fit(embeddings)

    user_model_path = os.path.join(USER_MODELS_DIR, str(user_id))
    os.makedirs(user_model_path, exist_ok=True)
    
    kmeans_path = os.path.join(user_model_path, 'kmeans_model.pkl')
    joblib.dump(kmeans, kmeans_path)
    logger.info(f"KMeans model saved for user {user_id} at {user_model_path}")
    
    return kmeans

def load_clustering_model(user_id):
    """
    Loads a user's trained K-Means clustering model.
    """
    user_model_path = os.path.join(USER_MODELS_DIR, str(user_id))
    kmeans_path = os.path.join(user_model_path, 'kmeans_model.pkl')

    if os.path.exists(kmeans_path):
        logger.info(f"Loading K-Means model for user {user_id}.")
        kmeans_model = joblib.load(kmeans_path)
        return kmeans_model
    else:
        logger.info(f"No K-Means model found for user {user_id}.")
        return None

# ⭐ MODIFIED: get_cluster_keywords_semantic for improved theme naming ⭐
def get_cluster_keywords_semantic(kmeans_model, journal_texts, num_keywords=5):
    """
    Extracts more meaningful keywords for each cluster based on semantic similarity.
    This approach tries to find the most representative entries for each cluster
    and then extracts keywords from those entries or the overall cluster content.
    Expects a list of raw journal texts.
    """
    if kmeans_model is None or not journal_texts:
        return {}

    cluster_themes = {}
    
    # Group texts by cluster ID
    clusters_data = defaultdict(list)
    for i, text in enumerate(journal_texts):
        if i < len(kmeans_model.labels_): # Check bounds
            cluster_id = kmeans_model.labels_[i]
            clusters_data[cluster_id].append(text)
        else:
            logger.warning(f"Text index {i} out of bounds for kmeans_model.labels_ (length {len(kmeans_model.labels_)}). Skipping text for keyword extraction.")

    for cluster_id, texts_in_cluster in clusters_data.items():
        # Initialize top_keywords for this cluster
        top_keywords = []

        if not texts_in_cluster:
            cluster_themes[f"Theme {cluster_id+1}"] = ["No entries in this theme"]
            continue

        preprocessed_cluster_texts = [preprocess_text_nltk(text) for text in texts_in_cluster]
        
        tfidf_vectorizer_cluster = TfidfVectorizer(max_features=100, min_df=1, stop_words='english')
        
        try:
            # Filter out empty strings from preprocessed_cluster_texts before fitting
            non_empty_preprocessed_texts = [t for t in preprocessed_cluster_texts if t.strip()]
            
            if not non_empty_preprocessed_texts:
                logger.warning(f"Cluster {cluster_id+1} has no non-empty preprocessed texts. Cannot extract TF-IDF keywords.")
                # Fallback to common words from raw texts if TF-IDF cannot be applied
                all_words_in_cluster = ' '.join(texts_in_cluster).lower()
                all_words_in_cluster = re.sub(r'[^a-z\s]', '', all_words_in_cluster)
                words_freq = [word for word in all_words_in_cluster.split() if word not in stop_words]
                if words_freq:
                    top_keywords = [word for word, count in Counter(words_freq).most_common(num_keywords)]
                else:
                    top_keywords = ["general"] # Default if absolutely no words are found
                cluster_themes[f"Theme {cluster_id+1}"] = top_keywords
                continue # Skip to next cluster as TF-IDF failed

            tfidf_matrix_cluster = tfidf_vectorizer_cluster.fit_transform(non_empty_preprocessed_texts)
            feature_names = tfidf_vectorizer_cluster.get_feature_names_out()
            
            # ⭐ CRITICAL FIX: Ensure cluster_tfidf_sum is a 1D array for argsort ⭐
            # Use .A.flatten() for sparse matrices to ensure it's a 1D numpy array
            cluster_tfidf_sum_flat = tfidf_matrix_cluster.sum(axis=0).A.flatten() # Corrected line

            # Get top N keywords, ensuring they are actual words and not stopwords
            if feature_names.size > 0:
                top_feature_indices = cluster_tfidf_sum_flat.argsort()[::-1] 
                # Filter for nouns and adjectives for more descriptive names
                pos_tagged_keywords = nltk.pos_tag(feature_names[top_feature_indices].tolist())
                descriptive_keywords = [
                    word for word, tag in pos_tagged_keywords 
                    if tag.startswith('N') or tag.startswith('J') # Nouns (NN, NNS, NNP, NNPS) or Adjectives (JJ, JJR, JJS)
                    and word not in stop_words
                ][:num_keywords]
                
                if not descriptive_keywords:
                    # Fallback to general keywords if no descriptive ones found
                    descriptive_keywords = [feature_names[idx] for idx in top_feature_indices.tolist() if feature_names[idx] and feature_names[idx] not in stop_words][:num_keywords]

                if descriptive_keywords:
                    # Form a more descriptive theme name
                    theme_name = ", ".join(descriptive_keywords[:2]) # Take top 2 for conciseness
                    if len(descriptive_keywords) > 2:
                        theme_name += "..." # Indicate more keywords if available
                    
                    if not theme_name: # Fallback if theme_name is empty after processing
                        theme_name = f"General Theme {cluster_id+1}"
                else:
                    theme_name = f"General Theme {cluster_id+1}" # Final fallback

                cluster_themes[f"Theme {cluster_id+1}"] = theme_name # Store as a single string
            else:
                cluster_themes[f"Theme {cluster_id+1}"] = f"General Theme {cluster_id+1}" # No features, use generic


        except Exception as e: # Catch any other unexpected errors during TF-IDF or keyword extraction
            cluster_themes[f"Theme {cluster_id+1}"] = f"Error Theme {cluster_id+1}" # Fallback on error
            logger.error(f"An unexpected error occurred during keyword extraction for cluster {cluster_id+1}: {e}", exc_info=True)
            
    return cluster_themes

# --- NEW ENDPOINT for Journal Clustering ---
@app.route('/cluster_journal_entries', methods=['POST'])
def cluster_journal_entries_endpoint():
    data = request.json
    user_id = data.get('userId')
    journal_texts = data.get('journalTexts', []) 
    n_clusters = data.get('nClusters', 5)

    if not user_id or not journal_texts: 
        return jsonify({"error": "User ID and journal texts are required for clustering."}), 400

    # Check if enough entries for clustering
    if len(journal_texts) < n_clusters: 
        n_clusters = len(journal_texts) 
        if n_clusters < 2: 
            return jsonify({"error": "You need at least 2 journal entries to perform clustering."}), 400
        logger.warning(f"Adjusting n_clusters to {n_clusters} as it was greater than the number of entries.")

    if len(journal_texts) < 2: 
        return jsonify({"error": "You need at least 2 journal entries to perform clustering."}), 400
    
    if sentence_model is None:
        return jsonify({"error": "Semantic clustering model not loaded. Please check Flask logs."}), 500

    try:
        # Pass journal_texts directly to the training function
        kmeans_model = train_and_save_clustering_model(user_id, journal_texts, n_clusters)
        
        if kmeans_model is None:
            return jsonify({"error": "Failed to train clustering model. Check logs for details."}), 500

        # Predict clusters for each entry using the loaded Sentence Transformer model
        embeddings_for_prediction = sentence_model.encode(journal_texts, show_progress_bar=False)
        entry_clusters = kmeans_model.predict(embeddings_for_prediction).tolist()

        # Get top keywords for each cluster using the new semantic approach
        # Pass journal_texts directly to the keyword extraction function
        cluster_themes = get_cluster_keywords_semantic(kmeans_model, journal_texts)

        response = {
            "numClusters": kmeans_model.n_clusters,
            "clusterThemes": cluster_themes, # This will now be a dict of cluster_id -> descriptive name string
            "entryClusters": entry_clusters
        }
        logger.info(f"Clustering completed for user {user_id}. Found {kmeans_model.n_clusters} clusters.")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error during journal clustering: {e}", exc_info=True)
        return jsonify({"error": "Failed to perform journal clustering."}), 500


# --- API Endpoint for Journal Analysis (Main endpoint) ---
@app.route('/analyze_journal', methods=['POST'])
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

# ⭐ NEW FUNCTION: get_gemini_milestone_insights ⭐
def get_gemini_milestone_insights(milestone_data):
    """
    Generates AI-driven insights for a given milestone and its tasks.
    Args:
        milestone_data (dict): A dictionary containing milestone and task details.
                               Expected structure:
                               {
                                   "title": "...",
                                   "description": "...",
                                   "dueDate": "YYYY-MM-DD" or null,
                                   "status": "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED",
                                   "completionPercentage": 0-100,
                                   "tasks": [
                                       {"description": "...", "dueDate": "YYYY-MM-DD" or null, "status": "PENDING" | "COMPLETED" | "OVERDUE" | "CANCELLED"},
                                       ...
                                   ]
                               }
    Returns:
        dict: A dictionary containing various insights, or None if API call fails.
    """
    title = milestone_data.get("title", "a goal")
    description = milestone_data.get("description", "no detailed description.")
    due_date = milestone_data.get("dueDate")
    status = milestone_data.get("status", "PENDING")
    completion_percentage = milestone_data.get("completionPercentage", 0)
    tasks = milestone_data.get("tasks", [])

    # Format tasks for the prompt
    tasks_str = ""
    if tasks:
        tasks_str = "\nTasks:\n"
        for i, task in enumerate(tasks):
            task_desc = task.get("description", "Unnamed task")
            task_status = task.get("status", "PENDING")
            task_due = task.get("dueDate", "No due date")
            tasks_str += f"- {task_desc} (Status: {task_status}, Due: {task_due})\n"
    else:
        tasks_str = "No specific tasks defined for this milestone."

    prompt = f"""
    Analyze the following milestone and its associated tasks to provide comprehensive insights.
    Focus on:
    1.  **Remaining Work:** What specific tasks are left, and how much time is remaining if a due date is present.
    2.  **Performance Assessment:** How well is the user progressing? Are they on track, falling behind, or excelling?
    3.  **Actionable Tips:** Provide 2-3 practical tips to help the user progress or improve.
    4.  **Encouragement:** Offer a brief, encouraging statement.
    5.  **New Task Suggestions:** Suggest 1-2 concrete, next-step tasks to help achieve the goal, especially if it's stalled.

    Milestone Details:
    Title: {title}
    Description: {description}
    Due Date: {due_date if due_date else 'Not set'}
    Current Status: {status}
    Completion Percentage: {completion_percentage}%
    {tasks_str}

    Provide the response as a JSON object with the following structure:
    {{
        "remainingWork": "string (summary of what's left)",
        "performanceAssessment": "string (how they're doing)",
        "tips": ["string", "string", ...],
        "encouragement": "string",
        "suggestedNewTasks": ["string", "string", ...],
        "status": "string (e.g., 'SUCCESS', 'ERROR', 'PARTIAL')"
    }}
    Ensure the "status" field is always included, indicating the success of insight generation.
    """

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "remainingWork": {"type": "STRING"},
            "performanceAssessment": {"type": "STRING"},
            "tips": {"type": "ARRAY", "items": {"type": "STRING"}},
            "encouragement": {"type": "STRING"},
            "suggestedNewTasks": {"type": "ARRAY", "items": {"type": "STRING"}},
            "status": {"type": "STRING"} # ⭐ CRITICAL FIX: Ensure 'status' is defined in the schema ⭐
        },
        "required": ["remainingWork", "performanceAssessment", "tips", "encouragement", "suggestedNewTasks", "status"] # ⭐ Ensure it's required ⭐
    }

    insights = call_gemini_api(prompt, response_schema)

    # ⭐ CRITICAL FIX: Ensure 'status' is populated even if Gemini fails or gives partial response ⭐
    if insights is None:
        logger.error("Gemini failed to generate milestone insights. Returning fallback response.")
        return {
            "remainingWork": "Unable to determine remaining work.",
            "performanceAssessment": "Unable to assess performance.",
            "tips": ["Review milestone details manually.", "Ensure all tasks are updated."],
            "encouragement": "Keep going! Manual review can also provide clarity.",
            "suggestedNewTasks": [],
            "status": "ERROR" # Indicate an error status
        }
    
    # If Gemini returns a response, but misses the status, default it to SUCCESS if other fields are present
    if "status" not in insights:
        insights["status"] = "SUCCESS" # Default to SUCCESS if Gemini provides other data but not status
        logger.warning("Gemini milestone insights response missing 'status' field. Defaulting to 'SUCCESS'.")

    return insights

# ⭐ NEW ENDPOINT: /milestone_insights ⭐
@app.route('/milestone_insights', methods=['POST'])
def milestone_insights_endpoint():
    data = request.json
    if not data:
        logger.error("No milestone data provided for insight generation.")
        return jsonify({
            "remainingWork": "No data provided.",
            "performanceAssessment": "No data to assess.",
            "tips": [],
            "encouragement": "Please provide milestone data.",
            "suggestedNewTasks": [],
            "status": "ERROR" # Added status for this error case
        }), 400

    try:
        insights = get_gemini_milestone_insights(data)
        if insights:
            return jsonify(insights)
        else:
            # This 'else' block will ideally be hit if get_gemini_milestone_insights returns None,
            # but the function itself now handles the None case by returning an ERROR dict.
            logger.error("get_gemini_milestone_insights returned None unexpectedly.")
            return jsonify({
                "remainingWork": "Failed to generate milestone insights from AI due to an unexpected null response.",
                "performanceAssessment": "Failed to generate due to an unexpected null response.",
                "tips": ["Review backend logs.", "Check Gemini API quota."],
                "encouragement": "We're experiencing a temporary issue. Please try again.",
                "suggestedNewTasks": [],
                "status": "ERROR" # Added status for this error case
            }), 500
    except Exception as e:
        logger.error(f"Error generating milestone insights: {e}", exc_info=True)
        return jsonify({
            "remainingWork": f"An internal error occurred: {str(e)}",
            "performanceAssessment": "Failed to generate due to an unexpected error.",
            "tips": ["Check backend logs for detailed error.", "Ensure all dependencies are installed."],
            "encouragement": "We encountered an issue. Please try again.",
            "suggestedNewTasks": [],
            "status": "ERROR" # Added status for this error case
        }), 500


if __name__ == '__main__':
    # Ensure NLTK data is downloaded on startup
    try:
        nltk.download('stopwords', quiet=True) # Added quiet=True for less console spam
        nltk.download('wordnet', quiet=True)
        nltk.download('punkt', quiet=True) # Added punkt
        nltk.download('averaged_perceptron_tagger', quiet=True)
        nltk.download('averaged_perceptron_tagger_eng', quiet=True) # Explicitly download this one
        logger.info("NLTK essential data downloaded successfully on startup.")
    except Exception as e:
        logger.error(f"Failed to download NLTK data on startup: {e}")

    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False) # use_reloader=False to prevent double loading of models