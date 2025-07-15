# D:\new ai\My_Mind_Mirror\ml-service\app.py

from flask import Flask, request, jsonify
from flask_cors import CORS # Make sure CORS is imported
import logging
import os

from config import Config # Import Config from the root directory
from modules.journal.routes import journal_bp
from modules.milestone.routes import milestone_bp
from modules.common.utils import call_gemini_api # Only need call_gemini_api here if reflection is handled here

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress Hugging Face Hub warnings
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'

app = Flask(__name__)
# ⭐ Ensure CORS is applied to the entire app instance, which should handle preflight requests globally ⭐
CORS(app) # Enable CORS for all origins and all routes by default

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
    # Consider setting debug=False and use_reloader=False for production
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)