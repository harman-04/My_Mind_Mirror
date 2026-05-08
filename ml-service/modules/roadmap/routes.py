import json
import re
import logging
from flask import Blueprint, request, jsonify
from modules.common.utils import call_gemini_api
from modules.common.gemini_api_client import GeminiAPIException

roadmap_bp = Blueprint('roadmap', __name__, url_prefix='/ml/roadmap')
logger = logging.getLogger(__name__)


# Add this helper at the top (after imports)
def generate_fallback_roadmap(goal, weeks):
    """Creates a complete, weekly‑based fallback roadmap for any duration."""
    tasks = []
    # 1. Create a basic task for every week
    for w in range(1, weeks + 1):
        tasks.append({
            "week": w,
            "day": 1,
            "description": f"Week {w}: Progress on {goal}",
            "details": "Follow your study plan. Use 'Continue Roadmap' to get detailed tasks for this week.",
            "subtasks": ["Review previous week", "Complete core exercises", "Plan next week"],
            "type": "daily"
        })
    # 2. Improve the first week's task
    tasks[0]["description"] = f"Start your journey: Create a study plan for {goal}"
    tasks[0]["details"] = "Break down the skills needed, gather resources, set weekly goals."

    # 3. Milestones every 4 weeks (monthly)
    milestones = []
    milestone_weeks = list(range(4, weeks + 1, 4))
    for w in milestone_weeks:
        milestones.append({
            "name": f"Month {w//4} Milestone: Progress in {goal}",
            "week": w,
            "criteria": f"Complete all tasks up to week {w}, demonstrate understanding."
        })
    # Ensure final week has a milestone even if not a multiple of 4
    if weeks not in milestone_weeks:
        milestones.append({
            "name": f"Final Milestone: Complete {goal} Roadmap",
            "week": weeks,
            "criteria": "All tasks are complete, ready for real‑world application."
        })

    # 4. Phases based on months (4 weeks each)
    phases = []
    num_phases = (weeks + 3) // 4
    for i in range(num_phases):
        start_week = i * 4 + 1
        end_week = min((i + 1) * 4, weeks)
        phase_name = "Foundation" if i == 0 else ("Advanced & Mastery" if i == num_phases - 1 else f"Deep Dive (Month {i+1})")
        phases.append({
            "name": phase_name,
            "weeks": end_week - start_week + 1,
            "description": f"Focus on {goal} during weeks {start_week}–{end_week}."
        })

    # 5. Resources (same as before)
    resources = [
        {"name": f"Search: {goal} tutorials", "url": f"https://www.google.com/search?q={goal.replace(' ', '+')}+tutorial", "type": "search"},
        {"name": f"YouTube: {goal} for beginners", "url": f"https://www.youtube.com/results?search_query={goal.replace(' ', '+')}+beginner", "type": "video"},
        {"name": f"Coursera: {goal} courses", "url": f"https://www.coursera.org/search?query={goal.replace(' ', '+')}", "type": "course"}
    ]

    return {
        "title": f"Your Personalized Roadmap to {goal}",
        "durationWeeks": weeks,
        "phases": phases,
        "tasks": tasks,
        "resources": resources,
        "milestones": milestones,
        "isFallback": True
    }# ------------------------------------------------------------------
# 1. JSON Schema for detailed roadmap (unchanged)
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
                    "day": {"type": ["integer", "null"]},  # allow null
                    "description": {"type": "string"},
                    "details": {"type": "string"},
                    "subtasks": {"type": "array", "items": {"type": "string"}},
                    "type": {"type": "string", "enum": ["daily", "weekly"]}
                },
                "required": ["week", "description", "type"]
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
# 3. Helper: convert any time unit to weeks
# ------------------------------------------------------------------
def convert_to_weeks(value, unit):
    unit = unit.upper()
    if unit == 'DAYS':
        return max(1, value // 7)
    elif unit == 'MONTHS':
        return value * 4
    elif unit == 'YEARS':
        return value * 52
    else:
        return max(1, value)

# ------------------------------------------------------------------
# 4. Helper: sanitize integer fields, but allow None for weekly day
# ------------------------------------------------------------------
def sanitize_integer_field(value, fallback=1, allow_none=False):
    if allow_none and value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        match = re.match(r'^(\d+)', value.strip())
        if match:
            return int(match.group(1))
        if value.isdigit():
            return int(value)
    return fallback


def ensure_all_weeks_have_task(tasks, total_weeks, goal):
    """Add a fallback task for any missing week."""
    existing_weeks = {t["week"] for t in tasks if "week" in t}
    for week in range(1, total_weeks + 1):
        if week not in existing_weeks:
            tasks.append({
                "week": week,
                "day": 1,
                "description": f"Week {week}: Continue your {goal} journey",
                "details": "Click 'Continue Roadmap' to get detailed tasks for this week.",
                "subtasks": [],
                "type": "daily"
            })
    return tasks
# ------------------------------------------------------------------
# 5. Repair missing fields – with sanitization and forced duration
# ------------------------------------------------------------------
def repair_roadmap(data, goal, requested_weeks):
    # Force durationWeeks to user-requested value
    data["durationWeeks"] = requested_weeks

    # Ensure title
    if "title" not in data or not data["title"]:
        data["title"] = f"Master {goal} in {requested_weeks} Weeks"

    # Phases
    if "phases" not in data or not data["phases"]:
        weeks1 = max(1, requested_weeks // 3)
        weeks2 = max(1, requested_weeks // 3)
        weeks3 = requested_weeks - weeks1 - weeks2
        data["phases"] = [
            {"name": "Foundation", "weeks": weeks1, "description": f"Learn core concepts of {goal}."},
            {"name": "Practice", "weeks": weeks2, "description": f"Apply knowledge through exercises."},
            {"name": "Mastery", "weeks": weeks3, "description": f"Deep dive and create a portfolio piece."}
        ]
    else:
        for phase in data["phases"]:
            phase["weeks"] = sanitize_integer_field(phase.get("weeks"), 1)
            phase.setdefault("description", f"Work on {phase.get('name', goal)}")

    # Tasks
    if "tasks" not in data or not data["tasks"]:
        # Fallback tasks (distributed across requested_weeks)
        tasks = []
        for week in range(1, requested_weeks + 1):
            tasks.append({
                "week": week, "day": 1,
                "description": f"Research and plan for {goal} (Week {week})",
                "details": f"Identify key resources and set weekly goals for {goal}.",
                "subtasks": [], "type": "daily"
            })
        data["tasks"] = tasks
    else:
        # Ensure each task has valid week/day and type
        for task in data["tasks"]:
            # week must be within 1..requested_weeks
            week = sanitize_integer_field(task.get("week"), 1)
            task["week"] = max(1, min(week, requested_weeks))

            # Handle day: if weekly, set None; else sanitize
            if task.get("type") == "weekly":
                task["day"] = None
            else:
                day = sanitize_integer_field(task.get("day"), 1)
                task["day"] = max(1, min(day, 7))

            task.setdefault("details", f"Complete: {task.get('description', '')}")
            task.setdefault("subtasks", [])
            task.setdefault("type", "daily")
            if task["type"] not in ["daily", "weekly"]:
                task["type"] = "daily"

    # Resources
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

    # Milestones (now at the correct indentation level, outside resources)
    if "milestones" not in data or not data["milestones"]:
        milestones = []
        step = max(1, requested_weeks // 3)
        for w in range(step, requested_weeks + 1, step):
            milestones.append({
                "name": f"Milestone: End of Phase {w//step+1} – Reflection & Review",
                "week": w,
                "criteria": f"Complete all tasks for the first {w} weeks. Take time to review your progress and plan the next steps."
            })
        if milestones and milestones[-1]["week"] != requested_weeks:
            milestones.append({
                "name": f"Congratulations! You've completed the '{goal}' roadmap!",
                "week": requested_weeks,
                "criteria": "All tasks are marked complete. Celebrate your achievement and decide what to learn next."
            })
        data["milestones"] = milestones
    else:
        for m in data["milestones"]:
            m["week"] = sanitize_integer_field(m.get("week"), 1)
            if not m.get("name") or not str(m.get("name")).strip():
                m["name"] = f"Milestone at week {m.get('week', 'unknown')}"
            m.setdefault("criteria", f"Achieve {m.get('name', 'milestone')}")    # Sort tasks by week, then day (None values go last)
    data["tasks"].sort(key=lambda t: (t.get("week", 999), t.get("day") or 999))
    # At the end of repair_roadmap, before the return
    data["tasks"] = ensure_all_weeks_have_task(data["tasks"], requested_weeks, goal)
    # Final safety: ensure all milestones have a name (just in case)
    for m in data.get("milestones", []):
        if not m.get("name"):
            m["name"] = f"Unnamed milestone (week {m.get('week', '?')})"
    return data


    # ------------------------------------------------------------------
# 6. Main endpoint
# ------------------------------------------------------------------
@roadmap_bp.route('/generate', methods=['POST'])
def generate_roadmap():
    data = request.json
    goal = data.get('goal')
    if not goal or str(goal).strip() == "":
        return jsonify({"error": "Goal is required"}), 400
    goal = str(goal).strip()

    # Duration logic
    timeframe_weeks = data.get('timeframeWeeks')
    timeframe_value = data.get('timeframeValue')
    timeframe_unit = data.get('timeframeUnit', 'WEEKS')

    if timeframe_weeks is not None:
        weeks = max(1, int(timeframe_weeks))
    elif timeframe_value is not None and timeframe_unit:
        weeks = convert_to_weeks(int(timeframe_value), timeframe_unit)
    else:
        weeks = 4

    # Personalisation
    difficulty = data.get('difficulty', 'BEGINNER')
    language = data.get('language', 'en')
    learning_style = data.get('learningStyle', 'READING')
    hours_per_week = data.get('hoursPerWeek', 10)
    avoid_weekends = data.get('avoidWeekends', False)
    api_key = request.headers.get('X-Gemini-Key')

    # ---- NEW: Only ask AI for first 12 weeks ----
    weeks_to_generate = min(weeks, 12)

    # Build prompt that limits to first weeks_to_generate weeks
    detailed_prompt = f"""
    You are an expert mentor. Create a detailed, actionable JSON roadmap for the goal: "{goal}" within {weeks} weeks.
    **You only need to generate detailed tasks for the first {weeks_to_generate} weeks**.
    For each of those weeks, provide 3-5 daily tasks (Monday‑Friday, day 1-5) with descriptions, details, and subtasks.

    **User Preferences:**
    - Difficulty: {difficulty}
    - Language: {language}
    - Learning style: {learning_style}
    - Hours/week: {hours_per_week}
    - Avoid weekends: {avoid_weekends}

    **Output Requirements (STRICT):**
    - JSON must contain these fields at the root level: title, durationWeeks, tasks.
    - "tasks" MUST be a flat array of objects. Do NOT nest tasks inside "phases" or "weeks".
    - Each task object must have:
      - week (integer, 1..{weeks_to_generate})
      - day (integer 1-5 for daily tasks, or null for weekly review)
      - description (short action)
      - details (longer instructions)
      - subtasks (array of strings)
      - type ("daily" or "weekly")
    - "resources": array of objects with "name", "url", "type" (relevant to the goal).
    - "milestones": array of objects with "name", "week", "criteria" (descriptive, e.g. "Understand Spring AI core concepts").
    - Use real resource URLs (optional – you can include them inside "details").
    - Return ONLY valid JSON, no extra text.
    """

    # After getting result, simply use result["tasks"]

    try:
        raw_response = call_gemini_api(detailed_prompt, api_key=api_key, temperature=0.1)
        logger.info(f"Raw Gemini response: {raw_response[:32432248000]}")  # log first 500 chars
        result = extract_json_robust(raw_response) if raw_response else None


        # If AI fails or returns nothing, use full fallback
        if not result or "tasks" not in result or not result["tasks"]:
            logger.warning("AI generated no valid tasks. Using full fallback roadmap.")
            result = generate_fallback_roadmap(goal, weeks)
        else:
            # Keep AI tasks only for weeks 1..weeks_to_generate
            ai_tasks = [t for t in result.get("tasks", []) if 1 <= t.get("week", 0) <= weeks_to_generate]
            # Generate fallback tasks for weeks > weeks_to_generate
            fallback_tasks = []
            for week in range(weeks_to_generate + 1, weeks + 1):
                fallback_tasks.append({
                    "week": week,
                    "day": 1,
                    "description": f"Continue mastering {goal} (Week {week})",
                    "details": f"Use the 'Continue Roadmap' button to get detailed tasks for this week.",
                    "subtasks": ["Review previous week", "Practice key skills", "Study one new concept"],
                    "type": "daily"
                })
            result["tasks"] = ai_tasks + fallback_tasks
            result["durationWeeks"] = weeks
            # Ensure other fields exist (use fallback for missing parts)
            if "phases" not in result or not result["phases"]:
                result["phases"] = generate_fallback_roadmap(goal, weeks)["phases"]
            if "milestones" not in result or not result["milestones"]:
                result["milestones"] = generate_fallback_roadmap(goal, weeks)["milestones"]
            if "resources" not in result or not result["resources"]:
                result["resources"] = generate_fallback_roadmap(goal, weeks)["resources"]

        # Final cleanup using repair_roadmap (ensures integer fields)
        result = repair_roadmap(result, goal, weeks)

        logger.info(f"Successfully generated roadmap for goal: {goal} with {weeks} weeks.")
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error generating roadmap: {e}", exc_info=True)
        fallback = generate_fallback_roadmap(goal, weeks)
        return jsonify(fallback)
# ------------------------------------------------------------------
# 7. Continue, Elaborate, Reschedule – unchanged (they already use personalisation via goal)
# ------------------------------------------------------------------
@roadmap_bp.route('/continue', methods=['POST'])
def continue_roadmap():
    data = request.json
    goal = data.get('goal')
    if not goal:
        return jsonify({"error": "Goal is required"}), 400

    # --- Chunked continuation parameters (including new summary) ---
    current_week = data.get('currentWeek', 0)
    weeks_to_generate = data.get('weeksToGenerate', 6)
    total_weeks = data.get('totalWeeks')
    original_unit = data.get('originalUnit', 'WEEKS')
    previous_summary = data.get('previousWeeksSummary', '')  # <-- NEW

    # Preferences (same as generation)
    difficulty = data.get('difficulty', 'BEGINNER')
    language = data.get('language', 'en')
    learning_style = data.get('learningStyle', 'READING')
    hours_per_week = data.get('hoursPerWeek', 10)
    avoid_weekends = data.get('avoidWeekends', False)

    api_key = request.headers.get('X-Gemini-Key')

    start_week = current_week + 1
    end_week = start_week + weeks_to_generate - 1
    if total_weeks:
        end_week = min(end_week, total_weeks)

    # Build prompt with previous weeks summary
    prompt = f"""
You are an expert mentor continuing a roadmap for the goal: "{goal}".

The roadmap spans {total_weeks if total_weeks else 'many'} weeks. Weeks 1 to {current_week} have already been planned.

**Topics already covered in previous weeks:**
{previous_summary if previous_summary else "No previous weeks. Start from the beginning."}

Now generate detailed, actionable tasks for weeks {start_week} to {end_week}.
Each week should have 3‑5 daily tasks (Monday‑Friday, days 1‑5).
**IMPORTANT:** Do NOT repeat topics that have already been covered in the previous weeks. Continue logically from where the previous weeks ended, introducing new concepts and building on what was learned.

**User Preferences:**
- Difficulty: {difficulty}
- Language: {language} – output ALL text in this language.
- Learning style: {learning_style}
- Hours per week available: {hours_per_week}
- Avoid weekends: {avoid_weekends}

**Output Requirements:**
Return a JSON object with a "tasks" array. Each task must have:
- week (integer, between {start_week} and {end_week})
- day (integer 1‑7 for daily tasks; null for weekly tasks)
- description (short action)
- details (longer instructions, resources)
- subtasks (array of strings)
- type ("daily" or "weekly")

Use the same language and style as the original goal.
Do NOT include tasks for weeks outside the requested range.
Return ONLY valid JSON, no extra text.
"""

    try:
        raw_response = call_gemini_api(prompt, api_key=api_key, temperature=0.2)
        result = extract_json_robust(raw_response) if raw_response else None

        if not result or "tasks" not in result or not result["tasks"]:
            return jsonify({"error": "AI did not return any tasks"}), 500

        # Sanitize: ensure week numbers are within range and day is valid
        for task in result["tasks"]:
            task["week"] = sanitize_integer_field(task.get("week"), start_week)
            task["week"] = max(start_week, min(task["week"], end_week))
            if task.get("type") == "weekly":
                task["day"] = None
            else:
                day = sanitize_integer_field(task.get("day"), 1)
                task["day"] = max(1, min(day, 7))
            task.setdefault("details", f"Complete: {task.get('description', '')}")
            task.setdefault("subtasks", [])
            task.setdefault("type", "daily")

        return jsonify(result)

    except GeminiAPIException as e:
        logger.error(f"Gemini API error in continue_roadmap: {e}")
        return jsonify({"error": str(e)}), e.status_code if e.status_code else 500
    except Exception as e:
        logger.error(f"Error in continue_roadmap: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@roadmap_bp.route('/elaborate', methods=['POST'])
def elaborate_task():
    # (unchanged)
    data = request.json
    goal = data.get('goal')
    task_description = data.get('taskDescription')
    enhance = data.get('enhance', False)
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
            result = {"details": f"Complete the task: {task_description}", "subtasks": [], "estimatedHours": 1}
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in elaborate_task: {e}")
        return jsonify({"details": task_description, "subtasks": [], "estimatedHours": 1})

@roadmap_bp.route('/reschedule', methods=['POST'])
def reschedule_roadmap():
    # (unchanged)
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