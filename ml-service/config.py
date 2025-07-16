import os
from dotenv import load_dotenv

# Load environment variables from .env file
# Ensure your .env file is in the ml-service directory or accessible
load_dotenv() 

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    # Using gemini-2.0-flash as specified, ensure this matches your actual usage
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    HEADERS = {'Content-Type': 'application/json'}

    MODEL_DIR = 'models'
    USER_MODELS_DIR = os.path.join(MODEL_DIR, 'user_specific_models')

    # Ensure model directories exist on startup
    os.makedirs(USER_MODELS_DIR, exist_ok=True)

    if not GEMINI_API_KEY:
        # Use print for config loading as logging might not be fully configured yet
        print("WARNING: GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.") 

    # --- Gemini API Quota Limits for gemini-2.0-flash (Paid Tier Reference) ---
    # IMPORTANT: These are based on the latest available documentation as of July 2025.
    # Always verify your specific project's actual quotas in Google Cloud Console.
    # The "Standard API rate limits" table shows:
    # Gemini 2.0 Flash: RPM: 30,000, TPM: 30,000,000
    # These are very high limits, so the proactive limiter will mostly act as a safeguard.
    GEMINI_API_RPM_LIMIT = 30000     # Requests Per Minute
    GEMINI_API_TPM_LIMIT = 30_000_000 # Tokens Per Minute

    # Timeout for API calls (in seconds). Adjust based on typical response times.
    GEMINI_API_TIMEOUT = 120