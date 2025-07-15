import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    HEADERS = {'Content-Type': 'application/json'}

    MODEL_DIR = 'models'
    USER_MODELS_DIR = os.path.join(MODEL_DIR, 'user_specific_models')

    # Ensure model directories exist on startup
    os.makedirs(USER_MODELS_DIR, exist_ok=True)

    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.") # Use print for config loading