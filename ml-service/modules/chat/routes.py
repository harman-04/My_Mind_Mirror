import logging
from flask import Blueprint, request, jsonify
from modules.common.utils import call_gemini_api

chat_bp = Blueprint('chat', __name__, url_prefix='/ml/chat')
logger = logging.getLogger(__name__)

@chat_bp.route('/reflect', methods=['POST'])
def reflect():
    data = request.json
    context = data.get('context', '')
    query = data.get('query', '')
    api_key = request.headers.get('X-Gemini-Key')

    if not query:
        return jsonify({"error": "Query is required"}), 400

    prompt = f"""
You are a compassionate, insightful AI reflection coach. The user has shared their recent journal entries (summaries and emotions). Your task is to answer their question based on that context.

Journal context:
{context}

User's question: {query}

Answer in a warm, helpful tone. Be specific to the user's entries. If you don't know, say so honestly.
Keep the answer concise (2-4 sentences).
"""

    try:
        answer = call_gemini_api(prompt, api_key=api_key, temperature=0.7)
        if not answer:
            answer = "I'm unable to answer right now. Please try again."
        return jsonify({"answer": answer})
    except Exception as e:
        logger.error(f"Error in reflect: {e}")
        return jsonify({"answer": "Sorry, I encountered an error. Please try again later."})


@chat_bp.route('/suggest-question', methods=['POST'])
def suggest_question():
    data = request.json
    context = data.get('context', '')
    api_key = request.headers.get('X-Gemini-Key')

    if not context:
        return jsonify({"question": "What's one thing you've learned about yourself recently?"})

    prompt = f"""
You are a compassionate AI reflection coach. Based on the user's recent journal entries (summaries and emotions), generate a single, insightful, open‑ended reflective question to help the user think deeper about their emotional patterns, progress, or challenges.

Journal context:
{context}

Return ONLY the question, no extra text. The question should be empathetic, specific (refer to themes if possible), and encourage self‑reflection. For example: "You mentioned feeling anxious about work last week – what's one small thing that could make tomorrow a little easier?"
"""

    try:
        question = call_gemini_api(prompt, api_key=api_key, temperature=0.7)
        if not question or not question.strip():
            question = "What's one thing you've learned about yourself recently?"
        logger.info(f"Generated reflective question: {question}")
        return jsonify({"question": question})
    except Exception as e:
        logger.error(f"Error generating reflective question: {e}")
        return jsonify({"question": "What's one thing you've learned about yourself recently?"})