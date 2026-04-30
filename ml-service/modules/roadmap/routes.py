import json
import re
import logging
from flask import Blueprint, request, jsonify
from modules.common.utils import call_gemini_api
from modules.common.gemini_api_client import GeminiAPIException

roadmap_bp = Blueprint('roadmap', __name__, url_prefix='/ml/roadmap')
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# 1. JSON Schema for detailed roadmap
# ------------------------------------------------------------------
ROADMAP_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "durationWeeks": {"type": "integer"},
        "phases": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "weeks": {"type": "integer"},
                    "description": {"type": "string"}
                },
                "required": ["name", "weeks", "description"]
            }
        },
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "week": {"type": "integer"},
                    "day": {"type": "integer"},
                    "description": {"type": "string"},
                    "details": {"type": "string"},
                    "subtasks": {"type": "array", "items": {"type": "string"}},
                    "type": {"type": "string", "enum": ["daily", "weekly"]}
                },
                "required": ["week", "day", "description", "type"]
            }
        },
        "resources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "url": {"type": "string"},
                    "type": {"type": "string"}
                },
                "required": ["name", "url", "type"]
            }
        },
        "milestones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "week": {"type": "integer"},
                    "criteria": {"type": "string"}
                },
                "required": ["name", "week"]
            }
        }
    },
    "required": ["title", "durationWeeks", "phases", "tasks", "resources", "milestones"]
}

# ------------------------------------------------------------------
# 2. Robust JSON extraction (unchanged)
# ------------------------------------------------------------------
def extract_json_robust(text):
    if not text:
        return None
    if isinstance(text, dict):
        return text
    text = str(text).strip()
    cleaned = re.sub(r'```json\s*|```', '', text, flags=re.IGNORECASE).strip()
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(cleaned[start:end+1])
        except json.JSONDecodeError:
            pass
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
    matches = re.findall(r'\{[^{}]*\}', text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match)
        except:
            continue
    logger.warning("Could not extract valid JSON from response.")
    return None

# ------------------------------------------------------------------
# 3. Repair missing fields with goal‑aware defaults (enhanced)
# ------------------------------------------------------------------
def repair_roadmap(data, goal, timeframe_weeks):
    # Ensure top fields
    if "title" not in data or not data["title"]:
        data["title"] = f"Master {goal} in {timeframe_weeks} Weeks"
    data["durationWeeks"] = timeframe_weeks

    # Default phases (if missing)
    if "phases" not in data or not data["phases"]:
        weeks1 = max(1, timeframe_weeks // 3)
        weeks2 = max(1, timeframe_weeks // 3)
        weeks3 = timeframe_weeks - weeks1 - weeks2
        data["phases"] = [
            {"name": "Foundation", "weeks": weeks1, "description": f"Learn core concepts of {goal}."},
            {"name": "Practice", "weeks": weeks2, "description": f"Apply knowledge through exercises."},
            {"name": "Mastery", "weeks": weeks3, "description": f"Deep dive and create a portfolio piece."}
        ]

    # Default tasks (if missing)
    if "tasks" not in data or not data["tasks"]:
        data["tasks"] = [
            {"week": 1, "day": 1, "description": f"Research the best resources for {goal}",
             "details": "Explore official docs, top tutorials, and community forums.",
             "subtasks": ["Find 3 high-quality resources", "Bookmark them"], "type": "daily"},
            {"week": 1, "day": 2, "description": f"Set up your learning environment",
             "details": "Install required software, create a project folder.", "subtasks": [], "type": "daily"},
            {"week": 1, "day": 3, "description": f"Complete first module on {goal}",
             "details": "Follow a structured course or tutorial.", "subtasks": [], "type": "daily"},
            {"week": 1, "day": 4, "description": f"Practice with a small exercise",
             "details": "Apply what you learned.", "subtasks": [], "type": "daily"},
            {"week": 1, "day": 5, "description": f"Review and plan next week",
             "details": "Reflect on progress, adjust schedule.", "subtasks": [], "type": "daily"}
        ]
    else:
        # Ensure each task has required fields, replace None with default
        for task in data["tasks"]:
            task.setdefault("details", f"Complete: {task.get('description', '')}")
            task.setdefault("subtasks", [])
            task.setdefault("type", "daily")
            if task["type"] not in ["daily", "weekly"]:
                task["type"] = "daily"
            # Replace None with large default for sorting
            if task.get("week") is None:
                task["week"] = 999
            if task.get("day") is None:
                task["day"] = 999

    # Default resources
    if "resources" not in data or not data["resources"]:
        data["resources"] = [
            {"name": f"Google: {goal} tutorials", "url": f"https://www.google.com/search?q={goal.replace(' ', '+')}+tutorial", "type": "search"},
            {"name": f"YouTube: {goal} for beginners", "url": f"https://www.youtube.com/results?search_query={goal.replace(' ', '+')}+beginner", "type": "video"},
            {"name": f"Coursera: {goal} courses", "url": f"https://www.coursera.org/search?query={goal.replace(' ', '+')}", "type": "course"}
        ]
    else:
        for res in data["resources"]:
            res.setdefault("type", "article")
            url = res.get("url", "")
            if "example.com" in url or not url.startswith("http"):
                res["url"] = f"https://www.google.com/search?q={res.get('name', goal).replace(' ', '+')}+{goal.replace(' ', '+')}"

    # Default milestones
    if "milestones" not in data or not data["milestones"]:
        data["milestones"] = [
            {"name": f"Foundation of {goal} completed", "week": max(1, timeframe_weeks // 3), "criteria": f"Can explain basic concepts of {goal}"},
            {"name": f"First project finished", "week": max(1, 2 * timeframe_weeks // 3), "criteria": f"Completed a small working project"},
            {"name": f"Ready to advance in {goal}", "week": timeframe_weeks, "criteria": f"Confident to tackle real-world challenges"}
        ]
    else:
        for m in data["milestones"]:
            m.setdefault("criteria", f"Achieve {m.get('name', 'milestone')}")

    # Sort tasks by week then day (now guaranteed to be integers)
    data["tasks"].sort(key=lambda t: (t.get("week", 999), t.get("day", 999)))
    return data
# ------------------------------------------------------------------
# 4. Main endpoint with enhanced prompt
# ------------------------------------------------------------------
@roadmap_bp.route('/generate', methods=['POST'])
def generate_roadmap():
    data = request.json
    goal = data.get('goal')
    timeframe_weeks = data.get('timeframeWeeks', 4)

    if not goal or str(goal).strip() == "":
        return jsonify({"error": "Goal is required"}), 400
    if timeframe_weeks is None:
        timeframe_weeks = 4

    goal = str(goal).strip()
    timeframe_weeks = max(1, int(timeframe_weeks))
    api_key = request.headers.get('X-Gemini-Key')

    # ------------------------------------------------------------------
    # Detailed prompt that requests details, subtasks, and sorting
    # ------------------------------------------------------------------
    detailed_prompt = f"""You are an expert mentor. Create a detailed, actionable JSON roadmap for the goal: "{goal}" within {timeframe_weeks} weeks.

    **Language & Style Instruction:**
    - Detect the language(s) and style (casual, formal, motivational) of the goal text.
    - Generate ALL output (title, phases, tasks descriptions, details, subtasks, resources names, milestone names, criteria) in the **same language(s) and style** as the goal. If the goal is in Hinglish, respond in Hinglish. If it's in Hindi (Devanagari), respond in Hindi. Preserve any code‑switching.

    The JSON MUST contain exactly these fields: title, durationWeeks, phases, tasks, resources, milestones.

    For each task, provide:
    - week (1 to {timeframe_weeks})
    - day (1 to 7, or null for weekly tasks)
    - description (short action)
    - details (longer instructions, tips, or links)
    - subtasks (array of strings, if applicable)
    - type ("daily" or "weekly")

    For each milestone, include a "criteria" field describing how to know it's achieved.

    Output tasks sorted by week then day (ascending). Use real resource URLs (official docs, YouTube, Coursera, Udemy, etc.).

    Example structure (do not copy the example values, generate for "{goal}"):
    {{
      "title": "Master React in 8 Weeks",
      "durationWeeks": 8,
      "phases": [
        {{"name": "Fundamentals", "weeks": 2, "description": "Learn JSX, components, props, state"}}
      ],
      "tasks": [
        {{
          "week": 1, "day": 1,
          "description": "Set up development environment",
          "details": "Install Node.js, create React app, explore folder structure.",
          "subtasks": ["Install Node.js", "Run npx create-react-app", "Start dev server"],
          "type": "daily"
        }}
      ],
      "resources": [
        {{"name": "React Official Docs", "url": "https://react.dev", "type": "documentation"}}
      ],
      "milestones": [
        {{"name": "Build first component", "week": 1, "criteria": "A working React component that displays data"}}
      ]
    }}

    Now generate for "{goal}" in {timeframe_weeks} weeks. Return ONLY valid JSON, no markdown, no extra text.
    """

    try:
        raw_response = call_gemini_api(detailed_prompt, api_key=api_key, temperature=0.2)
        result = extract_json_robust(raw_response) if raw_response else None

        if not result or len(result.keys()) < 4:
            logger.warning("Detailed prompt failed, using fallback repair.")
            # Use a minimal fallback structure
            result = {
                "title": f"Your Personalized Roadmap to {goal}",
                "durationWeeks": timeframe_weeks,
                "phases": [],
                "tasks": [],
                "resources": [],
                "milestones": []
            }

        # Repair missing fields and sort tasks
        result = repair_roadmap(result, goal, timeframe_weeks)
        logger.info(f"Successfully generated detailed roadmap for goal: {goal}")
        return jsonify(result)

    except GeminiAPIException as e:
        logger.error(f"Gemini API fatal error: {e}")
        fallback = {"title": f"Your Personalized Roadmap to {goal}", "durationWeeks": timeframe_weeks}
        return jsonify(repair_roadmap(fallback, goal, timeframe_weeks))
    except Exception as e:
        logger.error(f"Unexpected fatal error: {e}", exc_info=True)
        fallback = {"title": f"Your Personalized Roadmap to {goal}", "durationWeeks": timeframe_weeks}
        return jsonify(repair_roadmap(fallback, goal, timeframe_weeks))

@roadmap_bp.route('/continue', methods=['POST'])
def continue_roadmap():
    data = request.json
    goal = data.get('goal')
    completed_tasks = data.get('completedTasks', [])
    current_title = data.get('currentTitle', 'your roadmap')
    api_key = request.headers.get('X-Gemini-Key')

    if not goal:
        return jsonify({"error": "Goal is required"}), 400

    prompt = f"""
    You previously created a roadmap for the goal: "{goal}" (title: "{current_title}").
    The user has completed the following tasks:
    {chr(10).join(f'- {task}' for task in completed_tasks[:10])}

    **Language & Style Instruction:**
    - Detect the language(s) and style of the original goal and tasks.
    - Generate the new tasks (description, details, subtasks) in the **same language(s) and style**.

    Based on this progress, suggest the next 3-5 concrete, actionable tasks (daily or weekly) that the user should do to continue progressing toward the goal.
    Each task should have: description, details (longer instructions), subtasks (list of small steps), and a suggested week number (starting from the next week after the current roadmap's duration, but keep it reasonable, e.g., week 5,6,7).
    Return ONLY JSON with the following structure:
    {{
        "tasks": [
            {{
                "week": 5,
                "day": 1,
                "description": "...",
                "details": "...",
                "subtasks": ["step1", "step2"],
                "type": "daily"
            }}
        ]
    }}
    If the goal seems already achieved, return an empty tasks array.
    """

    try:
        raw_response = call_gemini_api(prompt, api_key=api_key, temperature=0.3)
        result = extract_json_robust(raw_response) if raw_response else None
        if not result or "tasks" not in result:
            result = {"tasks": []}
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in continue_roadmap: {e}")
        return jsonify({"tasks": []})


@roadmap_bp.route('/elaborate', methods=['POST'])
def elaborate_task():
    data = request.json
    goal = data.get('goal')
    task_description = data.get('taskDescription')
    enhance = data.get('enhance', False)  # ← new flag
    api_key = request.headers.get('X-Gemini-Key')

    if not goal or not task_description:
        return jsonify({"error": "Goal and task description are required"}), 400

    if enhance:
        prompt = f"""
        You are an expert mentor. The user is following a roadmap for the goal: "{goal}".
        One task in that roadmap is: "{task_description}".
        The user has already seen a basic elaboration and wants an **even more detailed, comprehensive guide**.

        **Language & Style Instruction:**
        - Detect the language(s) and style of the goal and task description.
        - Generate the details and subtasks in the **same language(s) and style**.

        Provide a **very detailed** step‑by‑step explanation, including:
        - Concrete examples
        - Best practices
        - Common pitfalls to avoid
        - A list of 4‑6 actionable subtasks (as an array of strings)
        - Estimated time to complete (in hours, e.g., 3.5)

        Return ONLY valid JSON with this structure:
        {{
            "details": "very detailed explanation...",
            "subtasks": ["subtask 1", "subtask 2", ...],
            "estimatedHours": 3.5
        }}
        """
    else:
        prompt = f"""
        You are an expert mentor. The user is following a roadmap for the goal: "{goal}".
        One task in that roadmap is: "{task_description}".

        **Language & Style Instruction:**
        - Detect the language(s) and style of the goal and task description.
        - Generate the details and subtasks in the **same language(s) and style**.

        Provide a detailed elaboration for this task. Include:
        - A longer, step‑by‑step explanation (details)
        - A list of 2‑4 concrete subtasks (as an array of strings)
        - Estimated time to complete (in hours, e.g., 1.5)

        Return ONLY valid JSON with this structure:
        {{
            "details": "step-by-step explanation...",
            "subtasks": ["subtask 1", "subtask 2", ...],
            "estimatedHours": 1.5
        }}
        """

    try:
        raw_response = call_gemini_api(prompt, api_key=api_key, temperature=0.2)
        result = extract_json_robust(raw_response) if raw_response else None
        if not result:
            result = {
                "details": f"Complete the task: {task_description}",
                "subtasks": [],
                "estimatedHours": 1
            }
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in elaborate_task: {e}")
        return jsonify({"details": task_description, "subtasks": [], "estimatedHours": 1})


@roadmap_bp.route('/reschedule', methods=['POST'])
def reschedule_roadmap():
    data = request.json
    goal = data.get('goal')
    original_duration = data.get('originalDuration', 4)
    completed_tasks = data.get('completedTasks', [])
    remaining_tasks = data.get('remainingTasks', [])
    api_key = request.headers.get('X-Gemini-Key')

    if not goal:
        return jsonify({"error": "Goal is required"}), 400

    prompt = f"""
    You are an expert mentor. The user has a roadmap for the goal: "{goal}" originally planned for {original_duration} weeks.
    They have completed the following tasks: {completed_tasks}
    They still have these remaining tasks: {remaining_tasks}

    **Language & Style Instruction:**
    - Detect the language(s) and style of the original goal and tasks.
    - Generate the revised schedule notes (newDurationWeeks) in the same language, but the output is mostly numeric and indices, so minimal text.

    Based on their progress, suggest a **revised weekly schedule** for the remaining tasks.
    Return ONLY JSON with the following structure:
    {{
        "newDurationWeeks": integer,
        "tasks": [
            {{
                "taskId": integer (index of the task in remaining_tasks list, starting from 0),
                "newWeek": integer (1‑based week number)
            }}
        ]
    }}
    Only include tasks that need a new week assignment. If no change needed, return empty tasks array.
    """

    try:
        raw_response = call_gemini_api(prompt, api_key=api_key, temperature=0.2)
        result = extract_json_robust(raw_response) if raw_response else None
        if not result:
            result = {"newDurationWeeks": original_duration, "tasks": []}
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in reschedule_roadmap: {e}")
        return jsonify({"newDurationWeeks": original_duration, "tasks": []})