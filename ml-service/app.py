# D:\new ai\My_Mind_Mirror\ml-service\app.py

from flask import Flask, request, jsonify
from flask_cors import CORS 
import logging
import os

# --- CORRECTED IMPORTS ---
# When running as 'python -m ml_service.app', 'ml_service' is the top-level package.
# All imports within the ml_service package should be relative to it.
from config import Config 
from modules.journal.routes import journal_bp
from modules.milestone.routes import milestone_bp
from modules.common.utils import call_gemini_api 
# --- END CORRECTED IMPORTS ---

# Basic logging configuration
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# ⭐ IMPORTANT: Set the gemini_api_client logger to DEBUG to see raw responses ⭐
# This is crucial for debugging the data crossover issue.
logging.getLogger('ml_service.modules.common.gemini_api_client').setLevel(logging.DEBUG)


# Suppress Hugging Face Hub warnings (good practice)
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'

app = Flask(__name__)
# Ensure CORS is applied to the entire app instance, which should handle preflight requests globally
CORS(app) 

if not Config.GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.")

# Register blueprints
app.register_blueprint(journal_bp)
app.register_blueprint(milestone_bp)

# Endpoint kept directly in app.py for /generate_reflection path compatibility
# This ensures it captures the OPTIONS request before blueprint-specific routing
@app.route('/generate_reflection', methods=['POST', 'OPTIONS'])
def generate_reflection_app_level():
    if request.method == 'OPTIONS':
        # This is a preflight request, just return 200 OK.
        # flask-cors will add the necessary headers.
        return '', 200
    
    data = request.json
    prompt_text = data.get('prompt_text', '')
    if not prompt_text:
        return jsonify({"error": "No prompt text provided"}), 400
    
    reflection_text = call_gemini_api(prompt_text)
    if reflection_text:
        return jsonify({"reflection": reflection_text})
    else:
        return jsonify({"error": "Failed to generate reflection from AI."}), 500

@app.route('/')
def home():
    return "Mind Mirror ML Service is running!"

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    # For local development, running with 'python -m ml_service.app' is preferred.
    # This app.run() block is fine if you're running it directly for quick tests,
    # but ensure your environment's PYTHONPATH is set up correctly or you're
    # running from the parent directory as a module.
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)