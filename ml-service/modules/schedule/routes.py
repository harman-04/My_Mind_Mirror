import logging
import json
import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from modules.common.utils import call_gemini_api

schedule_bp = Blueprint('schedule', __name__, url_prefix='/ml/schedule')
logger = logging.getLogger(__name__)

def extract_json_robust(text):
    """Extract JSON from a string that may contain markdown or extra text."""
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
    return None

# def fallback_schedule(tasks, available_hours, current_date_str):
#     """
#     Simple deterministic scheduler:
#     - Sort tasks by priority (HIGH > MEDIUM > LOW) and then by due date (earlier first).
#     - Distribute tasks into available time slots day by day.
#     """
#     if not tasks:
#         return [], []
#
#     # Define priority order
#     priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
#     # Sort tasks: first by priority, then by due date (None means far future)
#     def due_date_key(task):
#         due = task.get('dueDate')
#         if due:
#             return datetime.strptime(due, '%Y-%m-%d')
#         return datetime.max
#     sorted_tasks = sorted(tasks, key=lambda t: (priority_order.get(t.get('priority', 'MEDIUM'), 1), due_date_key(t)))
#
#     schedule = []
#     overflow = []
#
#     # Parse available hours into a dict day -> list of (start, end) time slots
#     day_slots = {}
#     for day, slots in available_hours.items():
#         day_slots[day] = []
#         for slot in slots:
#             if isinstance(slot, list) and len(slot) == 2:
#                 day_slots[day].append((slot[0], slot[1]))
#             elif isinstance(slot, dict) and 'start' in slot and 'end' in slot:
#                 day_slots[day].append((slot['start'], slot['end']))
#
#     # Start from today
#     current_date = datetime.strptime(current_date_str, '%Y-%m-%d')
#     date_counter = 0
#     max_days = 21  # schedule at most 3 weeks ahead
#
#     for task in sorted_tasks:
#         scheduled = False
#         for offset in range(max_days):
#             day = current_date + timedelta(days=offset)
#             day_name = day.strftime('%A').lower()
#             day_str = day.strftime('%Y-%m-%d')
#             # Check due date: skip if task has due date and day > due
#             due = task.get('dueDate')
#             if due and day > datetime.strptime(due, '%Y-%m-%d'):
#                 continue
#             # Get slots for this day
#             slots = day_slots.get(day_name, [])
#             if not slots:
#                 continue
#             # Use the first slot of the day
#             start_time, end_time = slots[0]
#             # Convert string "HH:MM" to LocalTime-like string
#             schedule.append({
#                 "taskId": task['id'],
#                 "date": day_str,
#                 "startTime": start_time,
#                 "endTime": end_time
#             })
#             scheduled = True
#             break
#         if not scheduled:
#             overflow.append(task['id'])
#
#     return schedule, overflow


def fallback_schedule(tasks, available_hours, current_date, current_time):
    """
    Simple deterministic scheduler that respects current time.
    """
    if not tasks:
        return [], []

    # Priority order
    priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    def due_date_key(task):
        due = task.get('dueDate')
        if due:
            return datetime.strptime(due, '%Y-%m-%d')
        return datetime.max

    sorted_tasks = sorted(tasks, key=lambda t: (priority_order.get(t.get('priority', 'MEDIUM'), 1), due_date_key(t)))

    schedule = []
    overflow = []

    # Parse available hours into a dict day -> list of (start, end) time slots
    day_slots = {}
    for day, slots in available_hours.items():
        day_slots[day] = []
        for slot in slots:
            if isinstance(slot, list) and len(slot) == 2:
                day_slots[day].append((slot[0], slot[1]))
            elif isinstance(slot, dict) and 'start' in slot and 'end' in slot:
                day_slots[day].append((slot['start'], slot['end']))

    # Start from today, but skip past time slots
    start_date = current_date
    date_counter = 0
    max_days = 21

    for task in sorted_tasks:
        scheduled = False
        for offset in range(max_days):
            day = start_date + timedelta(days=offset)
            day_name = day.strftime('%A').lower()
            day_str = day.strftime('%Y-%m-%d')
            # Check due date
            due = task.get('dueDate')
            if due and day > datetime.strptime(due, '%Y-%m-%d'):
                continue

            slots = day_slots.get(day_name, [])
            if not slots:
                continue

            # For today, find first slot that ends after current_time
            if day == start_date:
                for start_time, end_time in slots:
                    slot_start = datetime.strptime(start_time, '%H:%M').time()
                    slot_end = datetime.strptime(end_time, '%H:%M').time()
                    if slot_end > current_time:
                        # Use this slot, start at max(slot_start, current_time)
                        actual_start = max(slot_start, current_time)
                        if actual_start < slot_end:
                            schedule.append({
                                "taskId": task['id'],
                                "date": day_str,
                                "startTime": actual_start.strftime('%H:%M'),
                                "endTime": end_time
                            })
                            scheduled = True
                            break
                if scheduled:
                    break
            else:
                # For future days, use the first slot of the day
                start_time = slots[0][0]
                end_time = slots[0][1]
                schedule.append({
                    "taskId": task['id'],
                    "date": day_str,
                    "startTime": start_time,
                    "endTime": end_time
                })
                scheduled = True
                break

        if not scheduled:
            overflow.append(task['id'])

    return schedule, overflow


@schedule_bp.route('/generate', methods=['POST'])
def generate_schedule():
    data = request.json
    tasks = data.get('tasks', [])
    available_hours = data.get('availableHours', {})
    current_datetime_str = data.get('currentDateTime', '')
    api_key = request.headers.get('X-Gemini-Key')

    # Parse current datetime; fallback to now
    if current_datetime_str:
        try:
            current_datetime = datetime.fromisoformat(current_datetime_str)
        except Exception:
            current_datetime = datetime.now()
    else:
        current_datetime = datetime.now()

    current_date = current_datetime.date()
    current_time = current_datetime.time()

    if not tasks:
        return jsonify({"schedule": [], "overflow": []})

    # Build tasks description for AI
    tasks_desc = []
    for t in tasks:
        tasks_desc.append(
            f"- id: {t['id']}, title: {t['title']}, est: {t.get('estimatedHours',1)}h, "
            f"due: {t.get('dueDate','none')}, priority: {t.get('priority','MEDIUM')}"
        )
    tasks_str = "\n".join(tasks_desc)

    # Prepare available hours (unchanged)
    available_hours_str = json.dumps(available_hours, indent=2)

    # Enhanced prompt with current datetime instruction
    prompt = f"""
You are a smart scheduling assistant. Create a weekly schedule for the following tasks.

**Start scheduling from {current_datetime} (current datetime). Do NOT schedule any task before this moment.**
**Available hours per day (local time, 24h format):**
{available_hours_str}

**Tasks to schedule:**
{tasks_str}

**Rules:**
- Respect due dates (schedule earlier tasks first).
- Higher priority tasks (HIGH > MEDIUM > LOW) come before lower priority.
- Do not exceed available time slots per day.
- Each task must be assigned a specific day and time slot (startTime and endTime) that is **after the current moment**.
- If a task cannot fit into any free slot, add its id to "overflow" list.

**Output format (ONLY valid JSON, no extra text):**
{{
  "schedule": [
    {{ "taskId": "task-id-1", "date": "YYYY-MM-DD", "startTime": "09:00", "endTime": "10:00" }}
  ],
  "overflow": ["task-id-2", "task-id-3"]
}}

**Example:**
{{
  "schedule": [
    {{ "taskId": "abc123", "date": "2026-05-12", "startTime": "09:00", "endTime": "10:30" }}
  ],
  "overflow": []
}}

Now generate the schedule for the given tasks.
"""

    try:
        raw_response = call_gemini_api(prompt, api_key=api_key, temperature=0.2)
        parsed = extract_json_robust(raw_response) if raw_response else None

        # If AI returns a malformed response (e.g., a single task instead of schedule array), fix it
        if parsed:
            if "schedule" not in parsed:
                if "taskId" in parsed and "date" in parsed:
                    parsed = {"schedule": [parsed], "overflow": []}
                else:
                    parsed = {"schedule": [], "overflow": []}
            if "overflow" not in parsed:
                parsed["overflow"] = []
        else:
            # AI failed completely -> use fallback that respects current time
            logger.warning("AI schedule response invalid, using fallback")
            schedule, overflow = fallback_schedule(tasks, available_hours, current_date, current_time)
            parsed = {"schedule": schedule, "overflow": overflow}

        return jsonify(parsed)

    except Exception as e:
        logger.error(f"Error generating schedule: {e}", exc_info=True)
        schedule, overflow = fallback_schedule(tasks, available_hours, current_date, current_time)
        return jsonify({"schedule": schedule, "overflow": overflow})