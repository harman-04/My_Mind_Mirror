package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.enums.GamificationAction;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.mapper.ScheduleMapper;
import com.mymindmirror.backend.model.*;
import com.mymindmirror.backend.payload.request.ScheduleTaskRequest;
import com.mymindmirror.backend.payload.response.ScheduleItem;
import com.mymindmirror.backend.payload.response.ScheduleResponse;
import com.mymindmirror.backend.payload.response.ScheduledTaskResponse;
import com.mymindmirror.backend.repository.*;
import com.mymindmirror.backend.service.ai.DynamicAiClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

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
    private final GamificationService gamificationService;
    private final ScheduleMapper scheduleMapper;
    private final TransactionTemplate transactionTemplate;

    // Inner records for efficient task data mapping
    private record TaskInfo(String title, String priority) {}
    private record TaskMaps(
            Map<UUID, TaskInfo> roadmapTasks,
            Map<UUID, TaskInfo> milestoneTasks,
            Map<UUID, TaskInfo> customTasks
    ) {}

    public void generateSchedule(User user, String mode) {

        // 1. Get User Lifestyle Preferences (No active transaction needed)
        UserPreferences preferences = userPreferencesRepository.findByUser(user)
                .orElseGet(() -> createDefaultPreferences(user));

        TaskMaps taskMaps = loadTaskMaps(user);

        // 🔥 CRITICAL FIX: Simulate the deletion of incomplete tasks in memory!
        // We only tell the AI about COMPLETED tasks, forcing it to reschedule the incomplete ones.
        Set<UUID> alreadyScheduled = scheduledTaskRepository.findByUser(user).stream()
                .filter(ScheduledTask::isCompleted) // <-- The magic filter that fixes DeepSeek's bug
                .map(st -> {
                    if (st.getRoadmapTaskId() != null) return st.getRoadmapTaskId();
                    if (st.getMilestoneTaskId() != null) return st.getMilestoneTaskId();
                    if (st.getCustomTaskId() != null) return st.getCustomTaskId();
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // 3. Collect Tasks
        List<ScheduleTaskRequest.TaskItem> tasks = collectTasksByMode(user, mode, alreadyScheduled);
        log.info("Collected {} unscheduled tasks for user {}", tasks.size(), user.getUsername());

        if (tasks.isEmpty()) {
            log.info("No tasks to schedule. AI will only generate routines/breaks.");
        }

        List<ScheduleTaskRequest.TaskItem> aiTasks = tasks.size() > 15 ? tasks.subList(0, 15) : tasks;
        ZoneId userZone = ZoneId.of(preferences.getTimezone() != null ? preferences.getTimezone() : ZoneId.systemDefault().getId());
        LocalDateTime currentDateTime = LocalDateTime.now(userZone);

        // 4. Build Smart Prompt & Call AI (Outside of Transaction!)
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
        }

        // 5. Fallback for un-scheduled work tasks
        List<ScheduleTaskRequest.TaskItem> unscheduledRemaining;
        if (!useFallback) {
            unscheduledRemaining = tasks.stream()
                    .filter(t -> !newlyScheduledTaskIds.contains(t.id()))
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

        // 6. 🚀 Transactional Execution: Perform all DB Writes in a 50ms window!
        transactionTemplate.execute(status -> {

            // a. SURGICAL CLEAN SLATE (Delete the incomplete tasks we simulated deleting earlier)
            scheduledTaskRepository.deleteIncompleteByUser(user);
            scheduledTaskRepository.flush();

            // b. Map and Save New Tasks
            List<ScheduledTask> tasksToSave = new ArrayList<>();
            for (ScheduleItem item : finalScheduleItems) {
                if (item.date() == null || item.startTime() == null || item.endTime() == null) continue;

                ScheduledTask scheduled = new ScheduledTask();
                scheduled.setUser(user);
                scheduled.setScheduledDate(LocalDate.parse(item.date()));
                scheduled.setStartTime(LocalTime.parse(item.startTime()));
                scheduled.setEndTime(LocalTime.parse(item.endTime()));
                scheduled.setCompleted(false);
                scheduled.setReminderSent(false);

                String title = null;
                String priority = "LOW";

                if (item.taskId() != null && !item.taskId().isBlank() && !item.taskId().equals("null")) {
                    UUID taskId = UUID.fromString(item.taskId());
                    scheduled.setBlockType("WORK_TASK");

                    TaskInfo info = taskMaps.roadmapTasks().get(taskId);
                    if (info != null) {
                        scheduled.setRoadmapTaskId(taskId);
                        title = info.title();
                        priority = info.priority();
                    } else {
                        info = taskMaps.milestoneTasks().get(taskId);
                        if (info != null) {
                            scheduled.setMilestoneTaskId(taskId);
                            title = info.title();
                            priority = info.priority();
                        } else {
                            info = taskMaps.customTasks().get(taskId);
                            if (info != null) {
                                scheduled.setCustomTaskId(taskId);
                                title = info.title();
                                priority = info.priority();
                            } else {
                                continue; // Task ID not found, skip
                            }
                        }
                    }
                    scheduled.setTitle(title);
                    scheduled.setPriority(priority);
                } else {
                    scheduled.setTitle(item.title() != null ? item.title() : "Personal Time");
                    scheduled.setBlockType(item.blockType() != null ? item.blockType() : "ROUTINE");
                    scheduled.setPriority("LOW");
                }
                tasksToSave.add(scheduled);
            }

            if (!tasksToSave.isEmpty()) {
                scheduledTaskRepository.saveAll(tasksToSave);
            }

            gamificationService.recordActivity(user, GamificationAction.SCHEDULE);
            return null;
        });
    }

    public void reoptimizeToday(User user) {
        UserPreferences preferences = userPreferencesRepository.findByUser(user)
                .orElseGet(() -> createDefaultPreferences(user));

        ZoneId userZone = ZoneId.of(preferences.getTimezone() != null ? preferences.getTimezone() : ZoneId.systemDefault().getId());
        LocalDate today = LocalDate.now(userZone);
        LocalDateTime currentDateTime = LocalDateTime.now(userZone);

        TaskMaps taskMaps = loadTaskMaps(user);

        // 🔥 CRITICAL FIX: Simulate the deletion of ONLY today's incomplete tasks!
        Set<UUID> alreadyScheduled = scheduledTaskRepository.findByUser(user).stream()
                .filter(st -> st.isCompleted() || !st.getScheduledDate().equals(today)) // Keep completed OR tasks not on 'today'
                .map(st -> {
                    if (st.getRoadmapTaskId() != null) return st.getRoadmapTaskId();
                    if (st.getMilestoneTaskId() != null) return st.getMilestoneTaskId();
                    if (st.getCustomTaskId() != null) return st.getCustomTaskId();
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<ScheduleTaskRequest.TaskItem> tasks = collectTasksByMode(user, "all", alreadyScheduled);

        if (tasks.isEmpty()) {
            log.info("No tasks to re-optimize for user {}", user.getUsername());
            return;
        }

        List<ScheduleTaskRequest.TaskItem> aiTasks = tasks.size() > 8 ? tasks.subList(0, 8) : tasks;

        // AI Call Outside Transaction
        String prompt = buildReoptimizePrompt(aiTasks, preferences, currentDateTime, today);
        ScheduleResponse aiResponse = null;
        boolean useFallback = false;

        try {
            aiResponse = aiClientService.generateStructured(prompt, ScheduleResponse.class, user.getId(), AITask.SCHEDULE_REOPTIMIZATION);
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

        List<ScheduleTaskRequest.TaskItem> unscheduledRemaining = tasks.stream()
                .filter(t -> !newlyScheduledTaskIds.contains(t.id()))
                .collect(Collectors.toList());

        if (!unscheduledRemaining.isEmpty()) {
            Map<String, List<TimeSlot>> availableSlots = parseAvailableHours(preferences.getAvailableHoursJson());
            List<ScheduleItem> fallbackSchedule = simpleSchedule(unscheduledRemaining, availableSlots, today, currentDateTime.toLocalTime());
            finalScheduleItems.addAll(fallbackSchedule.stream()
                    .filter(item -> LocalDate.parse(item.date()).equals(today))
                    .toList());
        }

        // 🚀 Transactional Execution: Write to DB
        transactionTemplate.execute(status -> {
            scheduledTaskRepository.deleteIncompleteTodayByUser(user, today);
            scheduledTaskRepository.flush();

            List<ScheduledTask> tasksToSave = new ArrayList<>();
            for (ScheduleItem item : finalScheduleItems) {
                if (item.date() == null || item.startTime() == null || item.endTime() == null) continue;
                if (!LocalDate.parse(item.date()).equals(today)) continue;

                ScheduledTask scheduled = new ScheduledTask();
                scheduled.setUser(user);
                scheduled.setScheduledDate(LocalDate.parse(item.date()));
                scheduled.setStartTime(LocalTime.parse(item.startTime()));
                scheduled.setEndTime(LocalTime.parse(item.endTime()));
                scheduled.setCompleted(false);
                scheduled.setReminderSent(false);

                String title = null;
                String priority = "LOW";

                if (item.taskId() != null && !item.taskId().isBlank() && !item.taskId().equals("null")) {
                    UUID taskId = UUID.fromString(item.taskId());
                    scheduled.setBlockType("WORK_TASK");

                    TaskInfo info = taskMaps.roadmapTasks().get(taskId);
                    if (info != null) {
                        scheduled.setRoadmapTaskId(taskId);
                        title = info.title();
                        priority = info.priority();
                    } else {
                        info = taskMaps.milestoneTasks().get(taskId);
                        if (info != null) {
                            scheduled.setMilestoneTaskId(taskId);
                            title = info.title();
                            priority = info.priority();
                        } else {
                            info = taskMaps.customTasks().get(taskId);
                            if (info != null) {
                                scheduled.setCustomTaskId(taskId);
                                title = info.title();
                                priority = info.priority();
                            } else {
                                continue;
                            }
                        }
                    }
                    scheduled.setTitle(title);
                    scheduled.setPriority(priority);
                } else {
                    scheduled.setTitle(item.title() != null ? item.title() : "Personal Time");
                    scheduled.setBlockType(item.blockType() != null ? item.blockType() : "ROUTINE");
                    scheduled.setPriority("LOW");
                }
                tasksToSave.add(scheduled);
            }

            if (!tasksToSave.isEmpty()) {
                scheduledTaskRepository.saveAll(tasksToSave);
            }

            gamificationService.recordActivity(user, GamificationAction.SCHEDULE);
            return null;
        });
    }

    private TaskMaps loadTaskMaps(User user) {
        Map<UUID, TaskInfo> roadmapMap = roadmapTaskRepository.findByRoadmap_User(user).stream()
                .collect(Collectors.toMap(
                        RoadmapTask::getId,
                        task -> new TaskInfo(task.getDescription(), "MEDIUM")
                ));

        Map<UUID, TaskInfo> milestoneMap = milestoneTaskRepository.findByMilestone_User(user).stream()
                .collect(Collectors.toMap(
                        Task::getId,
                        task -> new TaskInfo(task.getDescription(), task.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM")
                ));

        Map<UUID, TaskInfo> customMap = customTaskRepository.findByUser(user).stream()
                .collect(Collectors.toMap(
                        CustomTask::getId,
                        task -> new TaskInfo(task.getTitle(), task.getPriority())
                ));

        return new TaskMaps(roadmapMap, milestoneMap, customMap);
    }

    private String buildSmartSchedulePrompt(List<ScheduleTaskRequest.TaskItem> tasks,
                                            UserPreferences prefs,
                                            LocalDateTime currentDateTime) {
        StringBuilder tasksDesc = new StringBuilder();
        for (ScheduleTaskRequest.TaskItem task : tasks) {
            tasksDesc.append(String.format("- id: %s, title: %s, est: %.1fh, due: %s, priority: %s\n",
                    task.id(), task.title(), task.estimatedHours() != null ? task.estimatedHours() : 1.0,
                    task.dueDate() != null ? task.dueDate() : "none", task.priority() != null ? task.priority() : "MEDIUM"));
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
        { "taskId": null, "title": "Stretch & Hydrate", "blockType": "ROUTINE", "date": "2026-05-12", "startTime": "10:30", "endTime": "10:45" }
      ],
      "overflow": ["task-id-2"]
    }
    """, currentDateTime.toString(), prefs.getEnergyPeak(), prefs.getWakeTime(),
                prefs.getSleepTime(), prefs.getLunchTime(), prefs.getDailyHabitsJson(), prefs.getAvailableHoursJson(), tasksDesc.toString());
    }

    private String buildReoptimizePrompt(List<ScheduleTaskRequest.TaskItem> tasks, UserPreferences prefs, LocalDateTime currentDateTime, LocalDate today) {
        StringBuilder tasksDesc = new StringBuilder();
        for (ScheduleTaskRequest.TaskItem task : tasks) {
            tasksDesc.append(String.format("- id: %s, title: %s, est: %.1fh, due: %s, priority: %s\n",
                    task.id(), task.title(), task.estimatedHours() != null ? task.estimatedHours() : 1.0,
                    task.dueDate() != null ? task.dueDate() : "none", task.priority() != null ? task.priority() : "MEDIUM"));
        }

        return String.format("""
    You are a real-time recovery and re-optimization AI coach.
    The user needs an immediate schedule for the REST OF TODAY ONLY.
    Current Time: %s
    Target Date: %s

    --- USER LIFESTYLE & PREFERENCES ---
    - Sleep time: %s
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
        { "taskId": "abc123", "title": "Build React App", "blockType": "WORK_TASK", "date": "2026-05-12", "startTime": "14:00", "endTime": "15:30" }
      ],
      "overflow": ["task-id-2"]
    }
    """, currentDateTime.toString(), today.toString(), prefs.getSleepTime(), prefs.getAvailableHoursJson(), tasksDesc.toString(), today.toString());
    }

    private List<ScheduleTaskRequest.TaskItem> collectTasksByMode(User user, String mode, Set<UUID> alreadyScheduled) {
        if ("custom".equals(mode)) return collectUnscheduledCustomTasks(user, alreadyScheduled);
        return collectUnscheduledTasks(user, alreadyScheduled);
    }

    private List<ScheduleTaskRequest.TaskItem> collectUnscheduledCustomTasks(User user, Set<UUID> alreadyScheduled) {
        List<ScheduleTaskRequest.TaskItem> items = new ArrayList<>();
        List<CustomTask> customTasks = customTaskRepository.findByUserAndCompletedFalse(user);
        for (CustomTask ct : customTasks) {
            if (alreadyScheduled.contains(ct.getId())) continue;
            items.add(new ScheduleTaskRequest.TaskItem(ct.getId().toString(), ct.getTitle(), ct.getEstimatedHours(), ct.getDueDate() != null ? ct.getDueDate().toString() : null, ct.getPriority()));
        }
        return items;
    }

    private List<ScheduleTaskRequest.TaskItem> collectUnscheduledTasks(User user, Set<UUID> alreadyScheduled) {
        List<ScheduleTaskRequest.TaskItem> items = new ArrayList<>();
        for (RoadmapTask rt : roadmapTaskRepository.findByRoadmap_User(user)) {
            if (rt.isCompleted() || alreadyScheduled.contains(rt.getId())) continue;
            items.add(new ScheduleTaskRequest.TaskItem(rt.getId().toString(), rt.getDescription(), estimateDuration(rt.getDetails(), rt.getDescription()), null, "MEDIUM"));
        }
        for (Task mt : milestoneTaskRepository.findByMilestone_User(user)) {
            if (mt.getStatus() == Status.COMPLETED || alreadyScheduled.contains(mt.getId())) continue;
            items.add(new ScheduleTaskRequest.TaskItem(mt.getId().toString(), mt.getDescription(), estimateDuration(mt.getDetails(), mt.getDescription()), mt.getDueDate() != null ? mt.getDueDate().toString() : null, mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM"));
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

    private List<ScheduleItem> simpleSchedule(List<ScheduleTaskRequest.TaskItem> tasks, Map<String, List<TimeSlot>> daySlots, LocalDate startDate, LocalTime currentTime) {
        List<ScheduleItem> result = new ArrayList<>();
        int maxDays = 21, currentDayOffset = 0, currentSlotIndex = 0;
        LocalTime currentTimeInSlot = null;

        tasks.sort((a, b) -> {
            int priorityCompare = Integer.compare(priorityRank(b.priority()), priorityRank(a.priority()));
            if (priorityCompare != 0) return priorityCompare;
            if (a.dueDate() == null && b.dueDate() == null) return 0;
            if (a.dueDate() == null) return 1;
            if (b.dueDate() == null) return -1;
            return a.dueDate().compareTo(b.dueDate());
        });

        for (ScheduleTaskRequest.TaskItem task : tasks) {
            boolean scheduled = false;
            double estHours = task.estimatedHours() != null ? task.estimatedHours() : 1.0;
            long estMinutes = (long) (estHours * 60);

            while (currentDayOffset < maxDays && !scheduled) {
                LocalDate currentDay = startDate.plusDays(currentDayOffset);
                List<TimeSlot> slots = daySlots.get(currentDay.getDayOfWeek().toString().toLowerCase());

                if (slots == null || slots.isEmpty() || currentSlotIndex >= slots.size()) {
                    currentDayOffset++; currentSlotIndex = 0; currentTimeInSlot = null; continue;
                }

                TimeSlot currentSlot = slots.get(currentSlotIndex);
                if (currentTimeInSlot == null) {
                    LocalTime proposedStart = currentSlot.start();
                    if (currentDay.equals(startDate) && proposedStart.isBefore(currentTime)) {
                        currentSlotIndex++; continue;
                    }
                    currentTimeInSlot = proposedStart;
                }

                LocalTime proposedEnd = currentTimeInSlot.plusMinutes(estMinutes);
                if (proposedEnd.isAfter(currentSlot.end())) {
                    currentSlotIndex++; currentTimeInSlot = null; continue;
                }

                if (currentDay.equals(startDate) && currentTimeInSlot.isBefore(currentTime)) {
                    currentTimeInSlot = currentTime;
                    proposedEnd = currentTimeInSlot.plusMinutes(estMinutes);
                    if (proposedEnd.isAfter(currentSlot.end())) { currentSlotIndex++; currentTimeInSlot = null; continue; }
                }

                result.add(new ScheduleItem(task.id(), task.title(), "WORK_TASK", currentDay.toString(), currentTimeInSlot.toString(), proposedEnd.toString()));
                currentTimeInSlot = proposedEnd;
                scheduled = true;
            }
        }
        return result;
    }

    private int priorityRank(String priority) {
        if ("HIGH".equals(priority)) return 3;
        if ("MEDIUM".equals(priority)) return 2;
        return 1;
    }

    private record TimeSlot(LocalTime start, LocalTime end) {}

    private Map<String, List<TimeSlot>> parseAvailableHours(String json) {
        Map<String, List<TimeSlot>> result = new HashMap<>();
        if (json == null || json.trim().isEmpty()) return getDefaultSlots();
        try {
            Map<String, Object> hoursMap = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            for (Map.Entry<String, Object> entry : hoursMap.entrySet()) {
                List<TimeSlot> slots = new ArrayList<>();
                for (List<String> slot : (List<List<String>>) entry.getValue()) {
                    slots.add(new TimeSlot(LocalTime.parse(slot.get(0)), LocalTime.parse(slot.get(1))));
                }
                result.put(entry.getKey().toLowerCase(), slots);
            }
        } catch (Exception e) { return getDefaultSlots(); }
        return result;
    }

    private Map<String, List<TimeSlot>> getDefaultSlots() {
        Map<String, List<TimeSlot>> map = new HashMap<>();
        List<TimeSlot> slots = Arrays.asList(new TimeSlot(LocalTime.of(9, 0), LocalTime.of(12, 0)), new TimeSlot(LocalTime.of(13, 0), LocalTime.of(17, 0)));
        for (String day : Arrays.asList("monday", "tuesday", "wednesday", "thursday", "friday")) map.put(day, slots);
        return map;
    }

    private UserPreferences createDefaultPreferences(User user) {
        UserPreferences prefs = new UserPreferences();
        prefs.setUser(user);
        prefs.setAvailableHoursJson("{\"monday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"tuesday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"wednesday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"thursday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"friday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]]}");
        prefs.setTimezone("Asia/Kolkata");
        return userPreferencesRepository.save(prefs);
    }

    // --- Data Fetching & Syncing Methods ---

    @Transactional(readOnly = true)
    public List<ScheduledTaskResponse> getScheduledTasks(User user, LocalDate start, LocalDate end) {
        return scheduleMapper.toResponseList(scheduledTaskRepository.findByUserAndScheduledDateBetween(user, start, end));
    }

    @Transactional
    public void moveScheduledTask(UUID taskId, User user, LocalDate newDate, LocalTime newStart, LocalTime newEnd) {
        ScheduledTask task = scheduledTaskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        if (!task.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized");
        }
        task.setScheduledDate(newDate);
        task.setStartTime(newStart);
        task.setEndTime(newEnd);
        scheduledTaskRepository.save(task);
    }

    @Transactional
    public void completeTask(UUID taskId, User user) {
        ScheduledTask task = scheduledTaskRepository.findById(taskId).orElseThrow(() -> new IllegalArgumentException("Task not found"));
        if (!task.getUser().getId().equals(user.getId())) throw new SecurityException("Unauthorized");
        task.setCompleted(true);
        scheduledTaskRepository.save(task);

        if (task.getCustomTaskId() != null) {
            customTaskRepository.findById(task.getCustomTaskId()).ifPresent(master -> {
                master.setCompleted(true);
                customTaskRepository.save(master);
                scheduledTaskRepository.findByCustomTaskId(master.getId()).forEach(linked -> {
                    if (!linked.getId().equals(task.getId())) {
                        linked.setCompleted(true);
                        scheduledTaskRepository.save(linked);
                    }
                });
            });
        }
        gamificationService.recordActivity(user, GamificationAction.TASK);
    }

    @Transactional
    public void scheduleCustomTaskManually(User user, UUID customTaskId, String title, LocalDate date, LocalTime startTime, LocalTime endTime, String priority) {
        ScheduledTask scheduled = new ScheduledTask();
        scheduled.setUser(user);
        scheduled.setCustomTaskId(customTaskId);
        scheduled.setTitle(title);
        scheduled.setScheduledDate(date);
        scheduled.setStartTime(startTime);
        scheduled.setEndTime(endTime);
        scheduled.setCompleted(false);
        scheduled.setPriority(priority != null ? priority : "MEDIUM");
        scheduledTaskRepository.save(scheduled);
    }
}