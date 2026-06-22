package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.*;
import com.mymindmirror.backend.payload.request.ScheduleTaskRequest;
import com.mymindmirror.backend.payload.response.ScheduleItem;
import com.mymindmirror.backend.payload.response.ScheduleResponse;
import com.mymindmirror.backend.repository.*;
import com.mymindmirror.backend.service.ai.DynamicAiClientService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final UserPreferencesRepository userPreferencesRepository;
    private final ScheduledTaskRepository scheduledTaskRepository;
    private final RoadmapTaskRepository roadmapTaskRepository;
    private final TaskRepository milestoneTaskRepository;
    private final CustomTaskRepository customTaskRepository;
    private final ObjectMapper objectMapper;
    private final DynamicAiClientService aiClientService;

    @Transactional
    public void generateSchedule(User user, String mode) {
        // 1. SURGICAL CLEAN SLATE (Preserve completed history!)
//        if ("custom".equals(mode)) {
//            scheduledTaskRepository.deleteIncompleteCustomAndRoutinesByUser(user);
//        } else {
//            scheduledTaskRepository.deleteIncompleteByUser(user);
//        }
        // 💡 THE FIX: Always wipe ALL incomplete tasks to prevent overlaps,
        // ensuring the calendar strictly matches the requested 'mode'.
        scheduledTaskRepository.deleteIncompleteByUser(user);
        scheduledTaskRepository.flush(); // Ensure DB is cleared before proceeding

        // 2. Get User Lifestyle Preferences
        UserPreferences preferences = userPreferencesRepository.findByUser(user)
                .orElseGet(() -> createDefaultPreferences(user));

        // 💡 Get a fast memory map of tasks already on the calendar so we NEVER duplicate!
        Set<UUID> alreadyScheduled = getAlreadyScheduledTaskIds(user);

        // 3. Collect Tasks
        List<ScheduleTaskRequest.TaskItem> tasks = collectTasksByMode(user, mode, alreadyScheduled);
        log.info("Collected {} unscheduled tasks for user {}", tasks.size(), user.getUsername());
        if (tasks.isEmpty()) {
            log.info("No tasks to schedule. AI will only generate routines/breaks.");
        }

        // Limit to top 15 tasks to prevent overwhelming the AI and the user's next 3 days
        List<ScheduleTaskRequest.TaskItem> aiTasks = tasks.size() > 15 ? tasks.subList(0, 15) : tasks;
//        LocalDateTime currentDateTime = LocalDateTime.now();

        // Use the user's actual timezone, defaulting to system timezone if null
        ZoneId userZone = ZoneId.of(preferences.getTimezone() != null ? preferences.getTimezone() : ZoneId.systemDefault().getId());
        LocalDateTime currentDateTime = LocalDateTime.now(userZone);
        // 4. Build Smart Prompt
        String prompt = buildSmartSchedulePrompt(aiTasks, preferences, currentDateTime);
        ScheduleResponse aiResponse = null;
        boolean useFallback = false;

        try {
            aiResponse = aiClientService.generateStructured(prompt, ScheduleResponse.class, user.getId(), AITask.SCHEDULE_GENERATION);
            if (aiResponse == null || aiResponse.schedule() == null) {
                useFallback = true;
            }
        } catch (Exception e) {
            log.error("AI schedule generation failed, using fallback", e);
            useFallback = true;
        }

        List<ScheduleItem> finalScheduleItems = new ArrayList<>();
        Set<String> newlyScheduledTaskIds = new HashSet<>();

        if (!useFallback && aiResponse != null) {
            finalScheduleItems.addAll(aiResponse.schedule());
            for (ScheduleItem item : aiResponse.schedule()) {
                if (item.taskId() != null && !item.taskId().isBlank() && !item.taskId().equals("null")) {
                    newlyScheduledTaskIds.add(item.taskId());
                }
            }
            log.info("AI returned {} scheduled blocks (including habits/breaks)", finalScheduleItems.size());
        } else {
            log.warn("AI returned no schedule, using fallback");
        }

        // 5. Fallback for un-scheduled work tasks
        List<ScheduleTaskRequest.TaskItem> unscheduledRemaining;
        if (!useFallback) {
            unscheduledRemaining = tasks.stream()
                    .filter(t -> !newlyScheduledTaskIds.contains(t.getId()))
                    .collect(Collectors.toList());
        } else {
            unscheduledRemaining = new ArrayList<>(tasks);
        }

        if (!unscheduledRemaining.isEmpty()) {
            log.info("Scheduling {} tasks using fallback scheduler", unscheduledRemaining.size());
            Map<String, List<TimeSlot>> availableSlots = parseAvailableHours(preferences.getAvailableHoursJson());
            List<ScheduleItem> fallbackSchedule = simpleSchedule(unscheduledRemaining, availableSlots, LocalDate.now(), LocalTime.now());
            finalScheduleItems.addAll(fallbackSchedule);
        }

        // 6. Save exactly to Database
        for (ScheduleItem item : finalScheduleItems) {
            if (item.date() == null || item.startTime() == null || item.endTime() == null) {
                log.warn("Invalid schedule item, skipping: {}", item);
                continue;
            }

            ScheduledTask scheduled = new ScheduledTask();
            scheduled.setUser(user);
            scheduled.setScheduledDate(LocalDate.parse(item.date()));
            scheduled.setStartTime(LocalTime.parse(item.startTime()));
            scheduled.setEndTime(LocalTime.parse(item.endTime()));
            scheduled.setCompleted(false);
            scheduled.setReminderSent(false);

            if (item.taskId() != null && !item.taskId().isBlank() && !item.taskId().equals("null")) {
                UUID taskId = UUID.fromString(item.taskId());
                scheduled.setBlockType("WORK_TASK");

                if (roadmapTaskRepository.existsById(taskId)) {
                    scheduled.setRoadmapTaskId(taskId);
                    RoadmapTask rt = roadmapTaskRepository.findById(taskId).get();
                    scheduled.setTitle(rt.getDescription());
                    scheduled.setPriority("MEDIUM");
                } else if (milestoneTaskRepository.existsById(taskId)) {
                    scheduled.setMilestoneTaskId(taskId);
                    Task mt = milestoneTaskRepository.findById(taskId).get();
                    scheduled.setTitle(mt.getDescription());
                    scheduled.setPriority(mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM");
                } else if (customTaskRepository.existsById(taskId)) {
                    scheduled.setCustomTaskId(taskId);
                    CustomTask ct = customTaskRepository.findById(taskId).get();
                    scheduled.setTitle(ct.getTitle());
                    scheduled.setPriority(ct.getPriority());
                } else {
                    continue;
                }
            } else {
                scheduled.setTitle(item.title() != null ? item.title() : "Personal Time");
                scheduled.setBlockType(item.blockType() != null ? item.blockType() : "ROUTINE");
                scheduled.setPriority("LOW");
            }

            scheduledTaskRepository.save(scheduled);
        }
    }

    private String buildSmartSchedulePrompt(List<ScheduleTaskRequest.TaskItem> tasks,
                                            UserPreferences prefs,
                                            LocalDateTime currentDateTime) {

        StringBuilder tasksDesc = new StringBuilder();
        for (ScheduleTaskRequest.TaskItem task : tasks) {
            tasksDesc.append(String.format("- id: %s, title: %s, est: %.1fh, due: %s, priority: %s\n",
                    task.getId(), task.getTitle(),
                    task.getEstimatedHours() != null ? task.getEstimatedHours() : 1.0,
                    task.getDueDate() != null ? task.getDueDate() : "none",
                    task.getPriority() != null ? task.getPriority() : "MEDIUM"));
        }

        return String.format("""
    You are an elite productivity and wellness AI coach. 
    Design a perfect, balanced daily schedule for the NEXT 3 DAYS for this user.
    Do NOT schedule anything in the past. Start scheduling from: %s

    --- USER LIFESTYLE & PREFERENCES ---
    - Energy Peak: %s 
    - Wake up: %s
    - Sleep: %s
    - Lunch time: %s
    - Daily Habits/Routines: %s
    - Strict Available Work Hours: %s

    --- TASKS TO ACCOMPLISH ---
    %s

    --- IRON-CLAD RULES ---
    1. TIME ACCURACY: The total scheduled duration for a WORK_TASK must exactly match its 'est' (estimated hours). 
    2. SPLITTING: If a task's 'est' is > 2.0h, split it into multiple smaller blocks across the day or week.
    3. BOUNDARIES: 'WORK_TASK' blocks MUST strictly fall within the 'Strict Available Work Hours'. 
    4. PRIORITIES & DEADLINES: Schedule tasks with earlier 'due' dates first.
    5. INVENTING BREAKS: Add 10-15 minute 'BREAK' blocks (taskId: null) between consecutive work tasks.
    6. HABITS: Schedule the items in 'Daily Habits/Routines' as 'ROUTINE' blocks (taskId: null). If empty, invent routines.
    7. MEALS: Schedule a 'MEAL' block (taskId: null) for Lunch around the provided Lunch time.
    8. OVERFLOW: If tasks cannot logically fit into the available work hours over the next 3 days, put the un-schedulable task IDs into the "overflow" array.
    9. NO OVERLAPS (CRITICAL): Tasks MUST NOT overlap in time. Every block must have a distinct, sequential start and end time. If one task ends at 10:00, the next cannot start before 10:00.

    --- OUTPUT FORMAT (Strict JSON ONLY) ---
    {
      "schedule": [
        { "taskId": "abc123", "title": "Build React App", "blockType": "WORK_TASK", "date": "2026-05-12", "startTime": "09:00", "endTime": "10:30" },
        { "taskId": null, "title": "Stretch & Hydrate", "blockType": "ROUTINE", "date": "2026-05-12", "startTime": "10:30", "endTime": "10:45" },
        { "taskId": null, "title": "Lunch", "blockType": "MEAL", "date": "2026-05-12", "startTime": "13:00", "endTime": "14:00" },
        { "taskId": null, "title": "Coffee Break", "blockType": "BREAK", "date": "2026-05-12", "startTime": "15:30", "endTime": "15:45" }
      ],
      "overflow": ["task-id-2"]
    }
    """, currentDateTime.toString(), prefs.getEnergyPeak(), prefs.getWakeTime(),
                prefs.getSleepTime(), prefs.getLunchTime(), prefs.getDailyHabitsJson(),
                prefs.getAvailableHoursJson(), tasksDesc.toString());
    }

    // 💡 THE FIX: Ultra-fast O(1) Memory lookup to prevent duplicates
    private Set<UUID> getAlreadyScheduledTaskIds(User user) {
        return scheduledTaskRepository.findAll().stream()
                .filter(st -> st.getUser().getId().equals(user.getId()))
                .map(st -> {
                    if (st.getRoadmapTaskId() != null) return st.getRoadmapTaskId();
                    if (st.getMilestoneTaskId() != null) return st.getMilestoneTaskId();
                    if (st.getCustomTaskId() != null) return st.getCustomTaskId();
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private List<ScheduleTaskRequest.TaskItem> collectTasksByMode(User user, String mode, Set<UUID> alreadyScheduled) {
        if ("custom".equals(mode)) {
            return collectUnscheduledCustomTasks(user, alreadyScheduled);
        } else {
            return collectUnscheduledTasks(user, alreadyScheduled);
        }
    }

    private List<ScheduleTaskRequest.TaskItem> collectUnscheduledCustomTasks(User user, Set<UUID> alreadyScheduled) {
        List<ScheduleTaskRequest.TaskItem> items = new ArrayList<>();
        List<CustomTask> customTasks = customTaskRepository.findByUserAndCompletedFalse(user);

        for (CustomTask ct : customTasks) {
            if (alreadyScheduled.contains(ct.getId())) continue; // Skip if already safely on the calendar

            ScheduleTaskRequest.TaskItem item = new ScheduleTaskRequest.TaskItem();
            item.setId(ct.getId().toString());
            item.setTitle(ct.getTitle());
            item.setEstimatedHours(ct.getEstimatedHours());
            item.setDueDate(ct.getDueDate() != null ? ct.getDueDate().toString() : null);
            item.setPriority(ct.getPriority());
            items.add(item);
        }
        return items;
    }

    private List<ScheduleTaskRequest.TaskItem> collectUnscheduledTasks(User user, Set<UUID> alreadyScheduled) {
        List<ScheduleTaskRequest.TaskItem> items = new ArrayList<>();

        List<RoadmapTask> roadmapTasks = roadmapTaskRepository.findByRoadmap_User(user);
        for (RoadmapTask rt : roadmapTasks) {
            if (rt.isCompleted() || alreadyScheduled.contains(rt.getId())) continue;

            ScheduleTaskRequest.TaskItem item = new ScheduleTaskRequest.TaskItem();
            item.setId(rt.getId().toString());
            item.setTitle(rt.getDescription());
            item.setEstimatedHours(estimateDuration(rt.getDetails(), rt.getDescription()));
            item.setDueDate(null);
            item.setPriority("MEDIUM");
            items.add(item);
        }

        List<Task> milestoneTasks = milestoneTaskRepository.findByMilestone_User(user);
        for (Task mt : milestoneTasks) {
            if (mt.getStatus() == Status.COMPLETED || alreadyScheduled.contains(mt.getId())) continue;

            ScheduleTaskRequest.TaskItem item = new ScheduleTaskRequest.TaskItem();
            item.setId(mt.getId().toString());
            item.setTitle(mt.getDescription());
            item.setEstimatedHours(estimateDuration(mt.getDetails(), mt.getDescription()));
            item.setDueDate(mt.getDueDate() != null ? mt.getDueDate().toString() : null);
            item.setPriority(mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM");
            items.add(item);
        }

        items.addAll(collectUnscheduledCustomTasks(user, alreadyScheduled));
        return items;
    }

    private Double estimateDuration(String details, String description) {
        if (details != null && details.length() > 100) return 2.0;
        if (description != null && (description.toLowerCase().contains("project") || description.toLowerCase().contains("review"))) return 2.0;
        if (details != null && details.length() > 50) return 1.5;
        return 1.0;
    }

    private List<ScheduleItem> simpleSchedule(List<ScheduleTaskRequest.TaskItem> tasks,
                                              Map<String, List<TimeSlot>> daySlots,
                                              LocalDate startDate,
                                              LocalTime currentTime) {
        List<ScheduleItem> result = new ArrayList<>();
        int maxDays = 21;

        tasks.sort((a, b) -> {
            int priorityCompare = Integer.compare(priorityRank(b.getPriority()), priorityRank(a.getPriority()));
            if (priorityCompare != 0) return priorityCompare;
            if (a.getDueDate() == null && b.getDueDate() == null) return 0;
            if (a.getDueDate() == null) return 1;
            if (b.getDueDate() == null) return -1;
            return a.getDueDate().compareTo(b.getDueDate());
        });

        int currentDayOffset = 0;
        int currentSlotIndex = 0;
        LocalTime currentTimeInSlot = null;

        for (ScheduleTaskRequest.TaskItem task : tasks) {
            boolean scheduled = false;
            double estHours = task.getEstimatedHours() != null ? task.getEstimatedHours() : 1.0;
            long estMinutes = (long) (estHours * 60);

            while (currentDayOffset < maxDays && !scheduled) {
                LocalDate currentDay = startDate.plusDays(currentDayOffset);
                String dayName = currentDay.getDayOfWeek().toString().toLowerCase();
                List<TimeSlot> slots = daySlots.get(dayName);

                if (slots == null || slots.isEmpty()) {
                    currentDayOffset++;
                    currentSlotIndex = 0;
                    currentTimeInSlot = null;
                    continue;
                }

                if (currentSlotIndex >= slots.size()) {
                    currentDayOffset++;
                    currentSlotIndex = 0;
                    currentTimeInSlot = null;
                    continue;
                }

                boolean isToday = currentDay.equals(startDate);
                TimeSlot currentSlot = slots.get(currentSlotIndex);

                if (currentTimeInSlot == null) {
                    LocalTime proposedStart = currentSlot.getStart();
                    if (isToday && proposedStart.isBefore(currentTime)) {
                        currentSlotIndex++;
                        continue;
                    }
                    currentTimeInSlot = proposedStart;
                }

                LocalTime proposedEnd = currentTimeInSlot.plusMinutes(estMinutes);

                if (proposedEnd.isAfter(currentSlot.getEnd())) {
                    currentSlotIndex++;
                    currentTimeInSlot = null;
                    continue;
                }

                if (isToday && currentTimeInSlot.isBefore(currentTime)) {
                    currentTimeInSlot = currentTime;
                    proposedEnd = currentTimeInSlot.plusMinutes(estMinutes);
                    if (proposedEnd.isAfter(currentSlot.getEnd())) {
                        currentSlotIndex++;
                        currentTimeInSlot = null;
                        continue;
                    }
                }

                result.add(new ScheduleItem(
                        task.getId(), task.getTitle(), "WORK_TASK",
                        currentDay.toString(), currentTimeInSlot.toString(), proposedEnd.toString()
                ));

                currentTimeInSlot = proposedEnd;
                scheduled = true;
            }

            if (!scheduled) {
                log.warn("Could not schedule task: {} within {} days. Calendar is completely full.", task.getTitle(), maxDays);
            }
        }
        return result;
    }

    private int priorityRank(String priority) {
        if ("HIGH".equals(priority)) return 3;
        if ("MEDIUM".equals(priority)) return 2;
        return 1;
    }

    private Map<String, List<TimeSlot>> parseAvailableHours(String json) {
        Map<String, List<TimeSlot>> result = new HashMap<>();
        if (json == null || json.trim().isEmpty()) {
            log.warn("Available hours JSON is empty, using default weekday schedule");
            return getDefaultSlots();
        }
        try {
            Map<String, Object> hoursMap = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            for (Map.Entry<String, Object> entry : hoursMap.entrySet()) {
                String day = entry.getKey().toLowerCase();
                List<List<String>> slotsRaw = (List<List<String>>) entry.getValue();
                List<TimeSlot> slots = new ArrayList<>();
                for (List<String> slot : slotsRaw) {
                    TimeSlot ts = new TimeSlot();
                    ts.setStart(LocalTime.parse(slot.get(0)));
                    ts.setEnd(LocalTime.parse(slot.get(1)));
                    slots.add(ts);
                }
                result.put(day, slots);
            }
        } catch (Exception e) {
            log.error("Failed to parse available hours JSON: {}", json, e);
            return getDefaultSlots();
        }
        return result;
    }

    private Map<String, List<TimeSlot>> getDefaultSlots() {
        Map<String, List<TimeSlot>> defaultMap = new HashMap<>();
        TimeSlot morning = new TimeSlot();
        morning.setStart(LocalTime.of(9, 0));
        morning.setEnd(LocalTime.of(12, 0));
        TimeSlot afternoon = new TimeSlot();
        afternoon.setStart(LocalTime.of(13, 0));
        afternoon.setEnd(LocalTime.of(17, 0));
        List<TimeSlot> slots = Arrays.asList(morning, afternoon);
        for (String day : Arrays.asList("monday", "tuesday", "wednesday", "thursday", "friday")) {
            defaultMap.put(day, slots);
        }
        return defaultMap;
    }

    private UserPreferences createDefaultPreferences(User user) {
        UserPreferences prefs = new UserPreferences();
        prefs.setUser(user);
        String defaultHours = "{\"monday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"tuesday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"wednesday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"thursday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"friday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]]}";
        prefs.setAvailableHoursJson(defaultHours);
        prefs.setTimezone("Asia/Kolkata");
        return userPreferencesRepository.save(prefs);
    }

    @Transactional
    public void reoptimizeToday(User user) {
        UserPreferences preferences = userPreferencesRepository.findByUser(user)
                .orElseGet(() -> createDefaultPreferences(user));

        ZoneId userZone = ZoneId.of(preferences.getTimezone() != null ? preferences.getTimezone() : ZoneId.systemDefault().getId());
        LocalDate today = LocalDate.now(userZone);
        LocalDateTime currentDateTime = LocalDateTime.now(userZone);

        // 1. SURGICAL STRIKE: Wipe ONLY today's incomplete tasks. Leave tomorrow and completed tasks alone.
        scheduledTaskRepository.deleteIncompleteTodayByUser(user, today);
        scheduledTaskRepository.flush();

        // 2. Collect unscheduled tasks
        Set<UUID> alreadyScheduled = getAlreadyScheduledTaskIds(user);
        List<ScheduleTaskRequest.TaskItem> tasks = collectTasksByMode(user, "all", alreadyScheduled);

        if (tasks.isEmpty()) {
            log.info("No tasks to re-optimize for user {}", user.getUsername());
            return;
        }

        // Limit to top 8 tasks since we are only filling the rest of today
        List<ScheduleTaskRequest.TaskItem> aiTasks = tasks.size() > 8 ? tasks.subList(0, 8) : tasks;

        // 3. Build the strict "Today Only" prompt
        String prompt = buildReoptimizePrompt(aiTasks, preferences, currentDateTime, today);
        ScheduleResponse aiResponse = null;
        boolean useFallback = false;

        try {
            aiResponse = aiClientService.generateStructured(prompt, ScheduleResponse.class, user.getId(), AITask.SCHEDULE_GENERATION);
            if (aiResponse == null || aiResponse.schedule() == null) useFallback = true;
        } catch (Exception e) {
            log.error("AI re-optimization failed, using fallback", e);
            useFallback = true;
        }

        List<ScheduleItem> finalScheduleItems = new ArrayList<>();
        Set<String> newlyScheduledTaskIds = new HashSet<>();

        if (!useFallback && aiResponse != null) {
            finalScheduleItems.addAll(aiResponse.schedule());
            for (ScheduleItem item : aiResponse.schedule()) {
                if (item.taskId() != null && !item.taskId().isBlank() && !item.taskId().equals("null")) {
                    newlyScheduledTaskIds.add(item.taskId());
                }
            }
        }

        // Fallback for strictly today
        List<ScheduleTaskRequest.TaskItem> unscheduledRemaining = tasks.stream()
                .filter(t -> !newlyScheduledTaskIds.contains(t.getId()))
                .collect(Collectors.toList());

        if (!unscheduledRemaining.isEmpty()) {
            Map<String, List<TimeSlot>> availableSlots = parseAvailableHours(preferences.getAvailableHoursJson());
            // Using simpleSchedule but it naturally schedules starting from current time
            List<ScheduleItem> fallbackSchedule = simpleSchedule(unscheduledRemaining, availableSlots, today, currentDateTime.toLocalTime());

            // Filter fallback to ONLY keep tasks scheduled for today
            finalScheduleItems.addAll(fallbackSchedule.stream()
                    .filter(item -> LocalDate.parse(item.date()).equals(today))
                    .toList());
        }

        // 4. Save to Database
        for (ScheduleItem item : finalScheduleItems) {
            if (item.date() == null || item.startTime() == null || item.endTime() == null) continue;

            // Strict safety check: Only save if the AI actually kept it on TODAY
            if (!LocalDate.parse(item.date()).equals(today)) continue;

            ScheduledTask scheduled = new ScheduledTask();
            scheduled.setUser(user);
            scheduled.setScheduledDate(LocalDate.parse(item.date()));
            scheduled.setStartTime(LocalTime.parse(item.startTime()));
            scheduled.setEndTime(LocalTime.parse(item.endTime()));
            scheduled.setCompleted(false);
            scheduled.setReminderSent(false);

            if (item.taskId() != null && !item.taskId().isBlank() && !item.taskId().equals("null")) {
                UUID taskId = UUID.fromString(item.taskId());
                scheduled.setBlockType("WORK_TASK");

                if (roadmapTaskRepository.existsById(taskId)) {
                    scheduled.setRoadmapTaskId(taskId);
                    scheduled.setTitle(roadmapTaskRepository.findById(taskId).get().getDescription());
                    scheduled.setPriority("MEDIUM");
                } else if (milestoneTaskRepository.existsById(taskId)) {
                    scheduled.setMilestoneTaskId(taskId);
                    Task mt = milestoneTaskRepository.findById(taskId).get();
                    scheduled.setTitle(mt.getDescription());
                    scheduled.setPriority(mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM");
                } else if (customTaskRepository.existsById(taskId)) {
                    scheduled.setCustomTaskId(taskId);
                    scheduled.setTitle(customTaskRepository.findById(taskId).get().getTitle());
                    scheduled.setPriority(customTaskRepository.findById(taskId).get().getPriority());
                } else continue;
            } else {
                scheduled.setTitle(item.title() != null ? item.title() : "Personal Time");
                scheduled.setBlockType(item.blockType() != null ? item.blockType() : "ROUTINE");
                scheduled.setPriority("LOW");
            }
            scheduledTaskRepository.save(scheduled);
        }
    }

    private String buildReoptimizePrompt(List<ScheduleTaskRequest.TaskItem> tasks, UserPreferences prefs, LocalDateTime currentDateTime, LocalDate today) {
        StringBuilder tasksDesc = new StringBuilder();
        for (ScheduleTaskRequest.TaskItem task : tasks) {
            tasksDesc.append(String.format("- id: %s, title: %s, est: %.1fh, due: %s, priority: %s\n",
                    task.getId(), task.getTitle(), task.getEstimatedHours() != null ? task.getEstimatedHours() : 1.0,
                    task.getDueDate() != null ? task.getDueDate() : "none", task.getPriority() != null ? task.getPriority() : "MEDIUM"));
        }

        return String.format("""
    You are a real-time recovery and re-optimization AI coach.
    The user needs an immediate schedule for the REST OF TODAY ONLY.
    Current Time: %s
    Target Date: %s

    --- USER LIFESTYLE & PREFERENCES ---
    - Sleep time: %s (DO NOT schedule anything after this time)
    - Strict Available Work Hours: %s

    --- TASKS TO ACCOMPLISH ---
    %s

    --- IRON-CLAD RULES ---
    1. TODAY ONLY: All generated 'date' fields MUST be exactly "%s". Do not schedule anything for tomorrow.
    2. TIME ACCURACY: The total scheduled duration for a WORK_TASK must match its 'est'. 
    3. BOUNDARIES: Start scheduling exactly from the Current Time. Stop completely before the user's Sleep time.
    4. NO OVERLAPS: Tasks MUST NOT overlap in time. Every block must have a distinct, sequential start and end time.
    5. OVERFLOW: If all tasks cannot fit into the remaining hours of today, put the un-schedulable task IDs into the "overflow" array. Do not force them into tomorrow.

    --- OUTPUT FORMAT (Strict JSON ONLY) ---
    {
      "schedule": [
        { "taskId": "abc123", "title": "Build React App", "blockType": "WORK_TASK", "date": "2026-05-12", "startTime": "14:00", "endTime": "15:30" },
        { "taskId": null, "title": "Coffee Break", "blockType": "BREAK", "date": "2026-05-12", "startTime": "15:30", "endTime": "15:45" }
      ],
      "overflow": ["task-id-2", "task-id-3"]
    }
    """, currentDateTime.toString(), today.toString(), prefs.getSleepTime(), prefs.getAvailableHoursJson(), tasksDesc.toString(), today.toString());
    }

    @Data
    private static class TimeSlot {
        private LocalTime start;
        private LocalTime end;
    }
}