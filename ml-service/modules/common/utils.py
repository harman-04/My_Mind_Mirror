# D:\new ai\My_Mind_Mirror\ml-service\modules\common\utils.py

import requests
import json
import re
import logging
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import os
import sys

# Add the ml-service root directory to the Python path
# This allows importing config.py directly from the root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from config import Config # ⭐ Corrected import for Config ⭐

logger = logging.getLogger(__name__)

# --- NLTK Data Download and Initialization ---
try:
    logger.info("Checking and downloading NLTK data...")
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True) # Added for more robust POS tagging
    nltk.download('averaged_perceptron_tagger_eng', quiet=True) # Added for more robust POS tagging
    logger.info("NLTK essential data checked/downloaded successfully.")
except Exception as e:
    logger.error(f"Failed to download NLTK data on startup. Error: {e}")

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

# --- Load Hugging Face Models Globally (Once) ---
sentiment_analyzer = None
try:
    sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")
    logger.info("✓ Sentiment Analyzer Loaded")
except Exception as e:
    logger.error(f"Failed to load sentiment analyzer: {e}")

sentence_model = None
try:
    sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("✓ Sentence Transformer Model Loaded: all-MiniLM-L6-v2")
except Exception as e:
    logger.error(f"Failed to load Sentence Transformer model: {e}")

# --- Text Preprocessing Function ---
def preprocess_text_nltk(text):
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
            f"{Config.GEMINI_API_URL}?key={Config.GEMINI_API_KEY}",
            headers=Config.HEADERS,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        logger.info("Gemini API call successful.")

        if result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
            response_text = result["candidates"][0]["content"]["parts"][0].get("text", "")
            
            if response_schema:
                # Attempt to extract JSON from markdown block (```json{...}```)
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
            else:
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