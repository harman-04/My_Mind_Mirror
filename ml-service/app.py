from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS
import os
import logging
import requests
import json
from dotenv import load_dotenv
from collections import defaultdict
import pandas as pd
import numpy as np
import re # Make sure re is imported

# --- New Imports for Clustering ---
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import joblib
# --- End New Imports ---

load_dotenv() # Load environment variables from .env file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
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
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        result = response.json()
        logger.info("Gemini API call successful.")

        if result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
            response_text = result["candidates"][0]["content"]["parts"][0]["text"]
            if response_schema:
                try:
                    return json.loads(response_text)
                except json.JSONDecodeError as e:
                    logger.error("Failed to decode JSON from Gemini response text: %s. Response text: %s", e, response_text)
                    return None
            return response_text
        else:
            logger.warning("Gemini API response structure unexpected or content missing: %s", result)
            return None
    except requests.exceptions.RequestException as e:
        logger.error("Gemini API request failed: %s", e)
        if hasattr(e, 'response') and e.response is not None:
            logger.error("Gemini API Error Response Body: %s", e.response.text) # Log error response body
        return None
    except json.JSONDecodeError as e:
        logger.error("Failed to decode JSON from Gemini response: %s", e)
        return None
    except Exception as e:
        logger.error("An unexpected error occurred during Gemini API call: %s", e)
        return None


# --- Gemini-Powered AI Functions ---

def get_gemini_emotions(journal_text):
    """
    Uses Gemini to identify emotions and their intensity scores (0.0 to 1.0).
    """
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
            "joy": {"type": "NUMBER"},
            "sadness": {"type": "NUMBER"},
            "anger": {"type": "NUMBER"},
            "fear": {"type": "NUMBER"},
            "surprise": {"type": "NUMBER"},
            "disgust": {"type": "NUMBER"},
            "love": {"type": "NUMBER"},
            "anxiety": {"type": "NUMBER"},
            "relief": {"type": "NUMBER"},
            "neutral": {"type": "NUMBER"},
            "excitement": {"type": "NUMBER"},
            "contentment": {"type": "NUMBER"},
            "frustration": {"type": "NUMBER"},
            "gratitude": {"type": "NUMBER"},
            "hope": {"type": "NUMBER"}
        },
    }

    emotions = call_gemini_api(prompt, response_schema)
    if emotions is None:
        logger.warning("Gemini failed to extract emotions. Returning empty dict.")
        return {}
    
    processed_emotions = {}
    for emotion, score in emotions.items():
        try:
            processed_emotions[emotion] = float(score)
        except (ValueError, TypeError):
            logger.warning(f"Invalid score for emotion '{emotion}': {score}. Skipping.")
            continue
    
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

    response_schema = {
        "type": "ARRAY",
        "items": { "type": "STRING" }
    }

    concerns = call_gemini_api(prompt, response_schema)
    if concerns is None:
        logger.warning("Gemini failed to extract core concerns. Returning empty list.")
        return []
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

    response_schema = {
        "type": "ARRAY",
        "items": { "type": "STRING" }
    }

    tips = call_gemini_api(prompt, response_schema)
    if tips is None:
        logger.warning("Gemini failed to generate growth tips. Returning empty list.")
        return ["Keep reflecting on your thoughts and feelings. You're doing great by journaling!"]
    return tips

def get_gemini_summary(journal_text):
    prompt = f"""Summarize the following journal entry concisely, in 1-3 sentences.
    Focus on the main points and overall sentiment.

    Journal Entry: "{journal_text}"

    Summary:"""

    summary = call_gemini_api(prompt)
    if summary is None:
        logger.warning("Gemini failed to generate summary. Returning truncated raw text.")
        return journal_text[:150] + "..." if len(journal_text) > 150 else journal_text
    return summary


@app.route('/generate_reflection', methods=['POST'])
def generate_reflection():
    data = request.json
    prompt_text = data.get('prompt_text', '')

    if not prompt_text:
        return jsonify({"error": "No prompt text provided"}), 400

    reflection_text = call_gemini_api(prompt_text)
    
    if reflection_text:
        return jsonify({"reflection": reflection_text})
    else:
        return jsonify({"error": "Failed to generate reflection from AI."}), 500


# --- Anomaly Detection Function (YOUR CUSTOM ML) ---
def detect_anomalies(daily_data_list):
    """
    Performs simple statistical anomaly detection on daily aggregated data.
    Flags days where average mood or total words deviate significantly from the recent average.
    
    Args:
        daily_data_list (list of dict): List of daily data points, each with 'date', 'averageMood', 'totalWords'.
    
    Returns:
        dict: Contains 'anomalies' (list of dict for anomalous days) and 'message'.
    """
    if len(daily_data_list) < 7: # Need at least a week of data for meaningful rolling average
        return {"anomalies": [], "message": "Not enough data for anomaly detection (need at least 7 days)."}

    # Convert to DataFrame for easier numerical operations
    df = pd.DataFrame(daily_data_list)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by='date').set_index('date')

    # Calculate rolling mean and standard deviation for mood and words
    # Use a window of 7 days (a week)
    window_size = 7
    df['mood_mean'] = df['averageMood'].rolling(window=window_size, min_periods=1).mean()
    df['mood_std'] = df['averageMood'].rolling(window=window_size, min_periods=1).std()
    df['words_mean'] = df['totalWords'].rolling(window=window_size, min_periods=1).mean()
    df['words_std'] = df['totalWords'].rolling(window=window_size, min_periods=1).std()

    # Define a threshold for anomaly detection (e.g., 2 standard deviations)
    # You can adjust this threshold for sensitivity
    mood_threshold_std = 1.5 # Lower threshold for mood to be more sensitive
    words_threshold_std = 2.0 # Higher threshold for words as they can vary more

    anomalies = []

    # Iterate through the data, skipping initial days where rolling stats are not stable
    # or where data might be missing (mood/words are null)
    for i in range(len(df)):
        current_day = df.iloc[i]
        
        # Skip if current day's data is null or rolling stats are not available
        if pd.isna(current_day['averageMood']) or pd.isna(current_day['totalWords']) or \
           pd.isna(current_day['mood_mean']) or pd.isna(current_day['mood_std']) or \
           pd.isna(current_day['words_mean']) or pd.isna(current_day['words_std']):
            continue

        is_mood_anomaly = False
        mood_deviation = None
        if current_day['mood_std'] > 0: # Avoid division by zero
            z_score_mood = (current_day['averageMood'] - current_day['mood_mean']) / current_day['mood_std']
            if abs(z_score_mood) > mood_threshold_std:
                is_mood_anomaly = True
                mood_deviation = "significantly " + ("lower" if z_score_mood < 0 else "higher")

        is_words_anomaly = False
        words_deviation = None
        if current_day['words_std'] > 0: # Avoid division by zero
            z_score_words = (current_day['totalWords'] - current_day['words_mean']) / current_day['words_std']
            if abs(z_score_words) > words_threshold_std:
                is_words_anomaly = True
                words_deviation = "much " + ("less" if z_score_words < 0 else "more")

        if is_mood_anomaly or is_words_anomaly:
            anomaly_details = {
                "date": current_day.name.strftime('%Y-%m-%d'), # Get date from index
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
    data = request.json # This will be a list of dicts from Spring Boot
    
    if not data:
        return jsonify({"error": "No daily aggregated data provided for anomaly detection"}), 400

    try:
        results = detect_anomalies(data)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error during anomaly detection: {e}", exc_info=True)
        return jsonify({"error": "Failed to perform anomaly detection."}), 500


# --- Text Preprocessing Function for Sentiment & Clustering ---
def preprocess_text(text): # Renamed to be general purpose
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Keep alphanumeric characters (a-z, 0-9) and spaces
    text = re.sub(r'[^a-z0-9\s]', '', text) 
    words = [word for word in text.split() if word]
    return " ".join(words)


# --- Journal Clustering Module Functions ---

def train_and_save_clustering_model(user_id, journal_texts, n_clusters=5):
    """
    Trains a TF-IDF vectorizer and K-Means clustering model for a given user.
    Saves the trained models to user-specific files.
    """
    if not journal_texts:
        logger.warning(f"No journal texts provided for user {user_id} to train clustering model.")
        return None, None

    logger.info(f"Training clustering model for user {user_id} with {len(journal_texts)} entries.")
    
    # Preprocess texts for clustering
    processed_texts = [preprocess_text(text) for text in journal_texts]
    
    # 1. TF-IDF Vectorization
    # max_features can be adjusted, min_df/max_df too.
    # These parameters make the TF-IDF unique to the user's data.
    tfidf_vectorizer = TfidfVectorizer(max_features=5000, min_df=5, max_df=0.8) 
    tfidf_matrix = tfidf_vectorizer.fit_transform(processed_texts)
    
    # 2. K-Means Clustering
    # Ensure n_clusters is not greater than the number of samples
    actual_n_clusters = min(n_clusters, tfidf_matrix.shape[0])
    if actual_n_clusters == 0:
        logger.warning(f"Not enough data to form clusters for user {user_id}. Need at least 1 entry.")
        return None, None

    kmeans_model = KMeans(n_clusters=actual_n_clusters, random_state=42, n_init=10) # n_init for robustness
    kmeans_model.fit(tfidf_matrix)

    # Save models
    user_model_path = os.path.join(USER_MODELS_DIR, str(user_id))
    os.makedirs(user_model_path, exist_ok=True)
    
    tfidf_path = os.path.join(user_model_path, 'tfidf_vectorizer.pkl')
    kmeans_path = os.path.join(user_model_path, 'kmeans_model.pkl')

    joblib.dump(tfidf_vectorizer, tfidf_path)
    joblib.dump(kmeans_model, kmeans_path)
    logger.info(f"Clustering models saved for user {user_id} at {user_model_path}")
    
    return tfidf_vectorizer, kmeans_model

def load_clustering_model(user_id):
    """
    Loads a user's trained TF-IDF vectorizer and K-Means clustering model.
    """
    user_model_path = os.path.join(USER_MODELS_DIR, str(user_id))
    tfidf_path = os.path.join(user_model_path, 'tfidf_vectorizer.pkl')
    kmeans_path = os.path.join(user_model_path, 'kmeans_model.pkl')

    if os.path.exists(tfidf_path) and os.path.exists(kmeans_path):
        logger.info(f"Loading clustering models for user {user_id}.")
        tfidf_vectorizer = joblib.load(tfidf_path)
        kmeans_model = joblib.load(kmeans_path)
        return tfidf_vectorizer, kmeans_model
    else:
        logger.info(f"No clustering models found for user {user_id}.")
        return None, None

def get_cluster_keywords(tfidf_vectorizer, kmeans_model, num_keywords=5):
    """
    Extracts top keywords for each cluster to represent its theme.
    """
    if tfidf_vectorizer is None or kmeans_model is None:
        return {}

    order_centroids = kmeans_model.cluster_centers_.argsort()[:, ::-1]
    terms = tfidf_vectorizer.get_feature_names_out()
    
    cluster_themes = {}
    for i in range(kmeans_model.n_clusters):
        top_terms = [terms[ind] for ind in order_centroids[i, :num_keywords]]
        cluster_themes[f"Cluster {i+1}"] = top_terms
    return cluster_themes

# --- NEW ENDPOINT for Journal Clustering ---
@app.route('/cluster_journal_entries', methods=['POST'])
def cluster_journal_entries_endpoint():
    data = request.json
    user_id = data.get('userId')
    journal_texts = data.get('journalTexts', [])
    n_clusters = data.get('nClusters', 5) # Default to 5 clusters

    if not user_id or not journal_texts:
        return jsonify({"error": "User ID and journal texts are required for clustering."}), 400

    try:
        # Train and save the model (or load if already trained)
        tfidf_vectorizer, kmeans_model = train_and_save_clustering_model(user_id, journal_texts, n_clusters)
        
        if tfidf_vectorizer is None or kmeans_model is None:
            return jsonify({"error": "Not enough data to perform clustering.", "clusters": [], "entry_clusters": []}), 200

        # Predict clusters for each entry
        processed_texts = [preprocess_text(text) for text in journal_texts]
        tfidf_matrix = tfidf_vectorizer.transform(processed_texts)
        entry_clusters = kmeans_model.predict(tfidf_matrix).tolist() # Convert numpy array to list

        # Get top keywords for each cluster
        cluster_themes = get_cluster_keywords(tfidf_vectorizer, kmeans_model)

        # Prepare response
        response = {
            "numClusters": kmeans_model.n_clusters,
            "clusterThemes": cluster_themes,
            "entryClusters": entry_clusters # List of cluster IDs for each entry (in order of input texts)
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
        "growthTips": []
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

    return jsonify(response_data)

if __name__ == '__main__':
    logger.info("\nAPI Ready! Access at http://127.0.0.1:5000/analyze_journal")
    logger.info("Anomaly Detection available at http://127.0.0.1:5000/anomaly_detection")
    logger.info("Reflection Generation available at http://127.0.0.1:5000/generate_reflection")
    logger.info("Journal Clustering available at http://127.0.0.1:5000/cluster_journal_entries")
    app.run(debug=True, port=5000)
