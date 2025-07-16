import logging
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import re
import os
import sys

# Ensure this path is correct relative to utils.py
# It should point to the directory containing your 'ml-service' folder.
# If utils.py is already within ml-service, then you might need a different path.
# Assuming ml-service is the project root, this path is good.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

# Import the new GeminiApiClient singleton instance
from modules.common.gemini_api_client import gemini_api_client
# Also import Config if other parts of utils.py need it directly (e.g., for global timeouts)
from config import Config

logger = logging.getLogger(__name__)

# --- NLTK Data Download and Initialization ---
# Ensure these are downloaded once, perhaps on application startup or within a Dockerfile
# For a Flask app, this might be better handled in app.py's initial setup.
try:
    logger.info("Checking and downloading NLTK data...")
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
    logger.info("NLTK essential data checked/downloaded successfully.")
except Exception as e:
    logger.error(f"Failed to download NLTK data on startup. Error: {e}")

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

# --- Load Hugging Face Models Globally (Once) ---
# These should ideally be loaded in the main app startup if they are large,
# or lazily loaded where truly needed. Keep this pattern for now if it works.
sentiment_analyzer = None
try:
    from transformers import pipeline
    sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")
    logger.info("✓ Sentiment Analyzer Loaded")
except Exception as e:
    logger.error(f"Failed to load sentiment analyzer: {e}")

sentence_model = None
try:
    from sentence_transformers import SentenceTransformer
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

# --- Public Gemini API Helper Function (now just a wrapper for the client) ---
def call_gemini_api(prompt_text, response_schema=None, temperature=0.7, timeout=None):
    """
    Public function to call Gemini API, now using the centralized GeminiApiClient.
    Uses Config.GEMINI_API_TIMEOUT as default if not specified.
    """
    # Use the timeout from Config if not explicitly provided
    actual_timeout = timeout if timeout is not None else Config.GEMINI_API_TIMEOUT
    return gemini_api_client.call_gemini_api(prompt_text, response_schema, temperature, actual_timeout)

# Add other utility functions here if needed
# Example:
def get_some_other_ml_insight(text):
    if sentiment_analyzer:
        return sentiment_analyzer(text)
    return "Sentiment analysis not available."