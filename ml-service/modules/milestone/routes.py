import logging
from flask import Blueprint, request, jsonify

# Import common utilities
from ..common.utils import call_gemini_api
import sys
import os

# Add the ml-service root directory to the Python path
# This allows importing config.py directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from config import Config # Assuming your config class is named Config
milestone_bp = Blueprint('milestone', __name__, url_prefix='/ml/milestone') # Note the url_prefix /ml/milestone

logger = logging.getLogger(__name__)

# --- Milestone AI Functions (Moved from app.py) ---
def get_gemini_milestone_insights(milestone_data):
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

    prompt = f"""
    Analyze the following milestone and its associated tasks to provide comprehensive insights.
    Focus on:
    1.  **Remaining Work:** What specific tasks are left, and how much time is remaining if a due date is present.
    2.  **Performance Assessment:** How well is the user progressing? Are they on track, falling behind, or excelling?
    3.  **Actionable Tips:** Provide 2-3 practical tips to help the user progress or improve.
    4.  **Encouragement:** Offer a brief, encouraging statement.
    5.  **New Task Suggestions:** Suggest 1-2 concrete, next-step tasks to help achieve the goal, especially if it's stalled.

    Milestone Details:
    Title: {title}
    Description: {description}
    Due Date: {due_date if due_date else 'Not set'}
    Current Status: {status}
    Completion Percentage: {completion_percentage}%
    {tasks_str}

    Provide the response as a JSON object with the following structure:
    {{
        "remainingWork": "string (summary of what's left)",
        "performanceAssessment": "string (how they're doing)",
        "tips": ["string", "string", ...],
        "encouragement": "string",
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

    insights = call_gemini_api(prompt, response_schema)

    if insights is None:
        logger.error("Gemini failed to generate milestone insights. Returning fallback response.")
        return {
            "remainingWork": "Unable to determine remaining work.",
            "performanceAssessment": "Unable to assess performance.",
            "tips": ["Review milestone details manually.", "Ensure all tasks are updated."],
            "encouragement": "Keep going! Manual review can also provide clarity.",
            "suggestedNewTasks": [],
            "status": "ERROR"
        }
    
    if "status" not in insights:
        insights["status"] = "SUCCESS"
        logger.warning("Gemini milestone insights response missing 'status' field. Defaulting to 'SUCCESS'.")

    return insights

# --- Milestone AI Endpoint (Moved from app.py) ---
@milestone_bp.route('/milestone_insights', methods=['POST'])
def milestone_insights_endpoint():
    data = request.json
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
        insights = get_gemini_milestone_insights(data)
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