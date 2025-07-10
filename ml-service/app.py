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

logger.info("Loading Hugging Face NLP Models...")

# Hugging Face Sentiment Analyzer
try:
    sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")
    logger.info("✓ Sentiment Analyzer Loaded")
except Exception as e:
    logger.error(f"Failed to load sentiment analyzer: {e}")
    sentiment_analyzer = None

logger.info("Hugging Face models loaded. Ready for Gemini integration.")


# --- Gemini API Helper Function (UPDATED FOR MORE LOGGING) ---
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
        # logger.debug("Gemini API Request Payload: %s", json.dumps(payload, indent=2)) # Log full payload
        # logger.debug("Gemini API URL: %s?key=%s", GEMINI_API_URL, GEMINI_API_KEY) # Log URL and key

        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers=HEADERS,
            json=payload,
            timeout=30
        )
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        result = response.json()
        logger.info("Gemini API call successful.")
        # logger.debug("Gemini API Response: %s", json.dumps(result, indent=2)) # Log full response

        if result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
            response_text = result["candidates"][0]["content"]["parts"][0]["text"]
            if response_schema:
                try:
                    # If responseMimeType is set, the 'text' part *should* already be valid JSON string.
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
        # ⭐ FIX: Removed "additionalProperties": True as it causes an error with Gemini API schema validation ⭐
    }

    emotions = call_gemini_api(prompt, response_schema)
    if emotions is None:
        logger.warning("Gemini failed to extract emotions. Returning empty dict.")
        return {}
    
    processed_emotions = {}
    for emotion, score in emotions.items():
        try:
            # Ensure scores are numbers, convert if necessary
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
    if tips is None: # Use 'is None' for consistency, though '== None' works for singletons
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


# --- API Endpoint for Journal Analysis ---
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

    # ⭐ Text Preprocessing Function for Sentiment (retained from train_sentiment_model.py, keeps numbers) ⭐
    def preprocess_text_for_sentiment(text):
        if not isinstance(text, str):
            return ""
        text = text.lower()
        # Keep alphanumeric characters (a-z, 0-9) and spaces
        text = re.sub(r'[^a-z0-9\s]', '', text) 
        words = [word for word in text.split() if word]
        return " ".join(words)

    # Note: Hugging Face sentiment is not explicitly used for `moodScore` or `emotions` in this flow,
    # as Gemini is now the primary source for these.
    # The `sentiment_analyzer` pipeline is still loaded, but its output is not used here.
    # The `analysis_text` truncation logic is also not strictly needed if HF is not used.

    # 1. Emotion Recognition (Gemini AI)
    response_data["emotions"] = get_gemini_emotions(journal_text) 
    
    # 2. Mood Score (Derived from Emotion Recognition)
    emotion_weights = {
        'joy': 1.0, 'love': 1.0, 'surprise': 0.5, 'amusement': 0.5, 'excitement': 0.8,
        'sadness': -1.0, 'anger': -0.8, 'fear': -0.7, 'disappointment': -0.6, 'grief': -1.0,
        'neutral': 0.0, 'optimism': 0.7, 'relief': 0.4, 'caring': 0.6, 'curiosity': 0.3,
        'embarrassment': -0.4, 'pride': 0.5, 'remorse': -0.5, 'annoyance': -0.3, 'disgust': -0.6,
        'stress': -0.7, # Added stress
        'frustration': -0.5, # Added frustration
        'gratitude': 0.9, # Added gratitude
        'hope': 0.8 # Added hope
    }
    
    calculated_mood_score = 0.0
    total_emotion_score = 0.0
    
    if response_data["emotions"]:
        for emotion, score in response_data["emotions"].items():
            weight = emotion_weights.get(emotion.lower(), 0.0) # Ensure lower case for key lookup
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
    app.run(debug=True, port=5000)
