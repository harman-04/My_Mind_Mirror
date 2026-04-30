import re
import json
import logging
from flask import Blueprint, request, jsonify
from modules.common.utils import call_gemini_api
# Import common utilities
from ..common.utils import call_gemini_api
import sys
import os
from modules.common.gemini_api_client import GeminiAPIException

# Add the ml-service root directory to the Python path
# This allows importing config.py directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from config import Config # Assuming your config class is named Config
milestone_bp = Blueprint('milestone', __name__, url_prefix='/ml/milestone') # Note the url_prefix /ml/milestone

logger = logging.getLogger(__name__)

def extract_json_robust(text):
    """Extract JSON from a string that may contain markdown or extra text."""
    if not text:
        return None
    if isinstance(text, dict):
        return text

    text = str(text).strip()
    # Remove markdown code fences
    cleaned = re.sub(r'```json\s*|```', '', text, flags=re.IGNORECASE).strip()
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(cleaned[start:end+1])
        except json.JSONDecodeError:
            pass

    # Bracket counting
    brace_count = 0
    start_idx = -1
    for i, ch in enumerate(text):
        if ch == '{':
            if brace_count == 0:
                start_idx = i
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0 and start_idx != -1:
                try:
                    return json.loads(text[start_idx:i+1])
                except:
                    pass

    # Regex fallback
    matches = re.findall(r'\{[^{}]*\}', text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match)
        except:
            continue

    return None


# --- Milestone AI Functions (Moved from app.py) ---
def get_gemini_milestone_insights(milestone_data, api_key=None):
    title = milestone_data.get("title", "a goal")
    description = milestone_data.get("description", "no detailed description.")
    due_date = milestone_data.get("dueDate")
    status = milestone_data.get("status", "PENDING")
    completion_percentage = milestone_data.get("completionPercentage", 0)
    tasks = milestone_data.get("tasks", [])

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

    # Detect language/style from title/description (Gemini will auto‑adapt)
    prompt = f"""
    Analyze the following milestone and its associated tasks to provide comprehensive insights.
    **Language & Style Instruction:**
    - Detect the language(s) and style (casual, formal, motivational) of the milestone title and description.
    - Generate ALL text output (remainingWork, performanceAssessment, tips, encouragement, suggestedNewTasks) in the **same language(s) and style**.
    - Use markdown formatting where appropriate (e.g., **bold**, bullet points, `> quotes`) to make insights clearer and more actionable.

    Focus on:
    1.  **Remaining Work:** What specific tasks are left, and how much time is remaining if a due date is present. Write as a short paragraph, possibly with bullet points.
    2.  **Performance Assessment:** How well is the user progressing? Are they on track, falling behind, or excelling? Provide a concise evaluation.
    3.  **Actionable Tips:** Provide 2-3 practical, step‑by‑step tips to help the user progress or improve. Each tip should be a short paragraph with bullet points or numbered steps.
    4.  **Encouragement:** Offer a brief, encouraging statement (1-2 sentences) in the same tone.
    5.  **New Task Suggestions:** Suggest 1-2 concrete, next‑step tasks to help achieve the goal, especially if it's stalled. Each suggested task should be a short phrase (as a string).

    Milestone Details:
    Title: {title}
    Description: {description}
    Due Date: {due_date if due_date else 'Not set'}
    Current Status: {status}
    Completion Percentage: {completion_percentage}%
    {tasks_str}

    Provide the response as a JSON object with the following structure. Use markdown (e.g., **bold**, bullet points) inside the string fields where helpful.
    {{
        "remainingWork": "string (summary of what's left, may contain markdown)",
        "performanceAssessment": "string (how they're doing, may contain markdown)",
        "tips": ["string (markdown allowed)", "string", ...],
        "encouragement": "string (plain text or markdown)",
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
            "status": {"type": "STRING"}
        },
        "required": ["remainingWork", "performanceAssessment", "tips", "encouragement", "suggestedNewTasks", "status"]
    }

    try:
        insights = call_gemini_api(prompt, response_schema, api_key=api_key)

        if insights is None:
            raise GeminiAPIException("Gemini returned None", status_code=500)

        if "status" not in insights:
            insights["status"] = "SUCCESS"
            logger.warning("Gemini milestone insights response missing 'status' field. Defaulting to 'SUCCESS'.")

        return insights

    except GeminiAPIException as e:
        logger.error(f"Gemini API error in milestone insights: {e}")
        return {
            "remainingWork": "Unable to determine remaining work.",
            "performanceAssessment": "AI analysis unavailable.",
            "tips": ["Check your Gemini API key and quota.", "Ensure the ML service is running."],
            "encouragement": "Manual review is recommended. You can still track your progress manually.",
            "suggestedNewTasks": ["Review incomplete tasks", "Set a new deadline if needed"],
            "status": "ERROR",
            "error": {"message": str(e), "code": e.status_code}
        }
# --- Milestone AI Endpoint (Moved from app.py) ---
@milestone_bp.route('/milestone_insights', methods=['POST'])
def milestone_insights_endpoint():
    data = request.json
    api_key = request.headers.get('X-Gemini-Key')  # <-- proper indentation
    if not data:
        logger.error("No milestone data provided for insight generation.")
        return jsonify({
            "remainingWork": "No data provided.",
            "performanceAssessment": "No data to assess.",
            "tips": [],
            "encouragement": "Please provide milestone data.",
            "suggestedNewTasks": [],
            "status": "ERROR"
        }), 400

    try:
        insights = get_gemini_milestone_insights(data, api_key=api_key)  # <-- remove extra )
        if "error" in insights:
                logger.warning(f"Returning fallback milestone insights due to error: {insights['error']}")

        if insights:
            return jsonify(insights)
        else:
            logger.error("get_gemini_milestone_insights returned None unexpectedly.")
            return jsonify({
                "remainingWork": "Failed to generate milestone insights from AI due to an unexpected null response.",
                "performanceAssessment": "Failed to generate due to an unexpected null response.",
                "tips": ["Review backend logs.", "Check Gemini API quota."],
                "encouragement": "We're experiencing a temporary issue. Please try again.",
                "suggestedNewTasks": [],
                "status": "ERROR"
            }), 500
    except Exception as e:
        logger.error(f"Error generating milestone insights: {e}", exc_info=True)
        return jsonify({
            "remainingWork": f"An internal error occurred: {str(e)}",
            "performanceAssessment": "Failed to generate due to an unexpected error.",
            "tips": ["Check backend logs for detailed error.", "Ensure all dependencies are installed."],
            "encouragement": "We encountered an issue. Please try again.",
            "suggestedNewTasks": [],
            "status": "ERROR"
        }), 500

@milestone_bp.route('/parse-growth-tip', methods=['POST'])
def parse_growth_tip():
    data = request.json
    tip_text = data.get('tipText', '')
    api_key = request.headers.get('X-Gemini-Key')

    if not tip_text:
        return jsonify({"error": "Tip text is required"}), 400

    prompt = f"""
    The following text is a self‑help / growth tip. It may be written in any language or mix of languages (e.g., Hinglish, English, Hindi, etc.).
    **Language & Style Instruction:**
    - Detect the language(s) and style (casual, formal, motivational) of the tip text.
    - Generate the output tasks in the **same language(s) and style** as the tip text. Preserve any code‑switching (e.g., Hinglish).

    Extract from the tip text:
    - A list of **concrete, actionable tasks** (3-5 items).
    Each task should have:
      - A short title (max 8 words) in the same language/style
      - A detailed description (2-3 sentences explaining the purpose, in the same language/style)
      - A list of 2-4 micro‑subtasks (the actual steps to complete the task, in the same language/style)

    Return ONLY valid JSON with structure:
    {{
        "tasks": [
            {{
                "title": "task title",
                "description": "detailed explanation",
                "subtasks": ["step 1", "step 2", ...]
            }},
            ...
        ]
    }}

    Tip text:
    {tip_text}
    """

    try:
        raw_response = call_gemini_api(prompt, api_key=api_key, temperature=0.2)
        parsed = extract_json_robust(raw_response) if raw_response else None

        if not parsed or "tasks" not in parsed or not isinstance(parsed["tasks"], list) or len(parsed["tasks"]) == 0:
            raise ValueError("Invalid or missing tasks in response")

        # Ensure each task has title, description, and subtasks
        for task in parsed["tasks"]:
            if "title" not in task or not task["title"].strip():
                task["title"] = "Actionable Step"
            if "description" not in task or not task["description"].strip():
                task["description"] = "Review the original tip and take the first step."
            if "subtasks" not in task or not isinstance(task["subtasks"], list):
                task["subtasks"] = []

        return jsonify(parsed)

    except Exception as e:
        logger.error(f"Error parsing growth tip: {e}")
        # Enhanced fallback: extract tasks from markdown headings and bullet points
        tasks = []
        lines = tip_text.split('\n')
        current_heading = None
        current_bullets = []

        for line in lines:
            # Detect headings (## or **bold** as heading)
            if line.startswith('## '):
                if current_heading and current_bullets:
                    tasks.append({
                        "title": current_heading[:50],
                        "description": f"Complete the following: {', '.join(current_bullets)}",
                        "subtasks": current_bullets
                    })
                current_heading = line[3:].strip()
                current_bullets = []
            elif line.startswith('- ') or line.startswith('* '):
                bullet = line[2:].strip()
                if bullet:
                    current_bullets.append(bullet)
            # Optional: also capture plain text as description? Not needed.

        if current_heading and current_bullets:
            tasks.append({
                "title": current_heading[:50],
                "description": f"Complete the following steps: {', '.join(current_bullets)}",
                "subtasks": current_bullets
            })

        if not tasks:
            # Fallback to simple bullet extraction
            bullet_points = re.findall(r'^[\-\*]\s+(.*?)$', tip_text, re.MULTILINE)
            if bullet_points:
                for i, bp in enumerate(bullet_points[:5]):
                    tasks.append({
                        "title": bp[:50],
                        "description": f"Complete: {bp}",
                        "subtasks": []
                    })
            else:
                tasks = [{
                    "title": "Review Growth Tip",
                    "description": "Take a moment to reflect on the advice and plan your next step.",
                    "subtasks": []
                }]

        return jsonify({"tasks": tasks})