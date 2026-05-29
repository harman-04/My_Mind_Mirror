package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.*;
import com.mymindmirror.backend.payload.request.ScheduleTaskRequest;
import com.mymindmirror.backend.repository.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final WebClient mlServiceWebClient;
    private final ApiKeyService apiKeyService;
    private final UserPreferencesRepository userPreferencesRepository;
    private final ScheduledTaskRepository scheduledTaskRepository;
    private final RoadmapTaskRepository roadmapTaskRepository;
    private final TaskRepository milestoneTaskRepository;
    private final CustomTaskRepository customTaskRepository;
    private final ObjectMapper objectMapper;


//    @Transactional
//    public void generateSchedule(User user) {
//        scheduledTaskRepository.deleteByUser(user);
//
//        // 1. Get user preferences
//        UserPreferences preferences = userPreferencesRepository.findByUser(user)
//                .orElseGet(() -> createDefaultPreferences(user));
//        String availableHoursJson = preferences.getAvailableHoursJson();
//
//        // 2. Collect ALL unscheduled tasks (with logging)
//        List<ScheduleTaskRequest.TaskItem> tasks = collectUnscheduledTasks(user);
//        log.info("Collected tasks for schedule generation: {} total (roadmap: {}, milestone: {}, custom: {})",
//                tasks.size(),
//                tasks.stream().filter(t -> t.getId().startsWith("roadmap_")).count(),
//                tasks.stream().filter(t -> t.getId().startsWith("milestone_")).count(),
//                tasks.stream().filter(t -> t.getId().startsWith("custom_")).count());
//
//        if (tasks.isEmpty()) {
//            log.info("No unscheduled tasks for user {}", user.getUsername());
//            return;
//        }
//
//        // Limit AI batch to first 20 tasks (Gemini can handle this many)
//        List<ScheduleTaskRequest.TaskItem> aiTasks = tasks.size() > 20 ? tasks.subList(0, 20) : tasks;
//        log.info("Sending {} tasks to AI for scheduling", aiTasks.size());
//
//        // 3. Call AI for schedule
//        Map<String, Object> request = Map.of(
//                "tasks", aiTasks,
//                "availableHours", availableHoursJson,
//                "currentDate", LocalDate.now().toString()
//        );
//        String apiKey = apiKeyService.getDecryptedApiKey(user);
//        log.debug("Sending to AI: tasks={}, availableHours={}", aiTasks.size(), availableHoursJson);
//        Map<String, Object> aiResponse = mlServiceWebClient.post()
//                .uri("/ml/schedule/generate")
//                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
//                .bodyValue(request)
//                .retrieve()
//                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
//                .block();
//
//        List<Map<String, Object>> schedule = new ArrayList<>();
//        if (aiResponse != null && aiResponse.containsKey("schedule")) {
//            schedule = (List<Map<String, Object>>) aiResponse.get("schedule");
//            log.info("AI returned {} scheduled tasks", schedule.size());
//        } else {
//            log.warn("AI returned no schedule, using fallback");
//        }
//
//        // 4. Build a set of task IDs that were scheduled by AI
//        Set<String> scheduledTaskIds = schedule.stream()
//                .map(item -> (String) item.get("taskId"))
//                .collect(Collectors.toSet());
//
//        // 5. Identify tasks that were not scheduled
//        List<ScheduleTaskRequest.TaskItem> unscheduledRemaining = tasks.stream()
//                .filter(t -> !scheduledTaskIds.contains(t.getId()))
//                .collect(Collectors.toList());
//
//        if (!unscheduledRemaining.isEmpty()) {
//            log.info("AI failed to schedule {} tasks, using fallback scheduler", unscheduledRemaining.size());
//            // Use the same deterministic scheduler as in Flask (or a local one)
//            LocalDate startDate = LocalDate.now();
//            Map<String, List<TimeSlot>> availableSlots = parseAvailableHours(availableHoursJson);
//            List<Map<String, Object>> fallbackSchedule = simpleSchedule(unscheduledRemaining, availableSlots, startDate);
//            schedule.addAll(fallbackSchedule);
//        }
//
//        // 6. Save all scheduled tasks
//        for (Map<String, Object> item : schedule) {
//            String taskIdStr = (String) item.get("taskId");
//            String dateStr = (String) item.get("date");
//            String startTimeStr = (String) item.get("startTime");
//            String endTimeStr = (String) item.get("endTime");
//
//            if (taskIdStr == null || dateStr == null || startTimeStr == null || endTimeStr == null) {
//                log.warn("Invalid schedule item, skipping: {}", item);
//                continue;
//            }
//
//            LocalDate date = LocalDate.parse(dateStr);
//            LocalTime start = LocalTime.parse(startTimeStr);
//            LocalTime end = LocalTime.parse(endTimeStr);
//            UUID taskId = UUID.fromString(taskIdStr);
//
//            ScheduledTask scheduled = new ScheduledTask();
//            scheduled.setUser(user);
//            scheduled.setScheduledDate(date);
//            scheduled.setStartTime(start);
//            scheduled.setEndTime(end);
//            scheduled.setCompleted(false);
//            scheduled.setReminderSent(false);
//
//            // Find which type of task
//            // Find which type of task and assign the correct priority
//            if (roadmapTaskRepository.existsById(taskId)) {
//                scheduled.setRoadmapTaskId(taskId);
//                RoadmapTask rt = roadmapTaskRepository.findById(taskId).get();
//                scheduled.setTitle(rt.getDescription());
//                scheduled.setPriority("MEDIUM"); // Roadmap is default medium
//            } else if (milestoneTaskRepository.existsById(taskId)) {
//                scheduled.setMilestoneTaskId(taskId);
//                Task mt = milestoneTaskRepository.findById(taskId).get();
//                scheduled.setTitle(mt.getDescription());
//                scheduled.setPriority(mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM");
//            } else if (customTaskRepository.existsById(taskId)) {
//                scheduled.setCustomTaskId(taskId);
//                CustomTask ct = customTaskRepository.findById(taskId).get();
//                scheduled.setTitle(ct.getTitle());
//                scheduled.setPriority(ct.getPriority()); // Grab the actual Custom Task priority!
//            } else {
//                log.warn("Task ID {} not found in any repository", taskId);
//                continue;
//            }
//            scheduledTaskRepository.save(scheduled);
//            log.info("Saved scheduled task: {} on {}", scheduled.getTitle(), date);
//        }
//    }


    @Transactional
    public void generateSchedule(User user, String mode) {
        // ✅ Delete ALL scheduled tasks for this user (clean slate)
        scheduledTaskRepository.deleteByUser(user);

        // 1. Get user preferences (unchanged)
        UserPreferences preferences = userPreferencesRepository.findByUser(user)
                .orElseGet(() -> createDefaultPreferences(user));
        String availableHoursJson = preferences.getAvailableHoursJson();

        // 2. Collect tasks based on mode
        List<ScheduleTaskRequest.TaskItem> tasks = collectTasksByMode(user, mode);
        log.info("Collected tasks for schedule generation (mode={}): {} total", mode, tasks.size());

        if (tasks.isEmpty()) {
            log.info("No unscheduled tasks for user {} in mode {}", user.getUsername(), mode);
            return;
        }


        // 3. AI scheduling (unchanged)
        List<ScheduleTaskRequest.TaskItem> aiTasks = tasks.size() > 20 ? tasks.subList(0, 20) : tasks;
        // ... rest of method identical to existing generateSchedule ...
        // (the rest of the method after collecting tasks remains the same)

        log.info("Sending {} tasks to AI for scheduling", aiTasks.size());

        // 3. Call AI for schedule
        Map<String, Object> request = Map.of(
                "tasks", aiTasks,
                "availableHours", availableHoursJson,
                "currentDateTime", LocalDateTime.now().toString()
        );
        String apiKey = apiKeyService.getDecryptedApiKey(user);
        log.debug("Sending to AI: tasks={}, availableHours={}", aiTasks.size(), availableHoursJson);
        Map<String, Object> aiResponse = mlServiceWebClient.post()
                .uri("/ml/schedule/generate")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        List<Map<String, Object>> schedule = new ArrayList<>();
        if (aiResponse != null && aiResponse.containsKey("schedule")) {
            schedule = (List<Map<String, Object>>) aiResponse.get("schedule");
            log.info("AI returned {} scheduled tasks", schedule.size());
        } else {
            log.warn("AI returned no schedule, using fallback");
        }

        // 4. Build a set of task IDs that were scheduled by AI
        Set<String> scheduledTaskIds = schedule.stream()
                .map(item -> (String) item.get("taskId"))
                .collect(Collectors.toSet());

        // 5. Identify tasks that were not scheduled
        List<ScheduleTaskRequest.TaskItem> unscheduledRemaining = tasks.stream()
                .filter(t -> !scheduledTaskIds.contains(t.getId()))
                .collect(Collectors.toList());

        if (!unscheduledRemaining.isEmpty()) {
            log.info("AI failed to schedule {} tasks, using fallback scheduler", unscheduledRemaining.size());
            // Use the same deterministic scheduler as in Flask (or a local one)
            LocalDate startDate = LocalDate.now();
            LocalTime currentTime = LocalTime.now();
            Map<String, List<TimeSlot>> availableSlots = parseAvailableHours(availableHoursJson);
            List<Map<String, Object>> fallbackSchedule = simpleSchedule(unscheduledRemaining, availableSlots, startDate, currentTime);
            schedule.addAll(fallbackSchedule);
        }

        // 6. Save all scheduled tasks
        for (Map<String, Object> item : schedule) {
            String taskIdStr = (String) item.get("taskId");
            String dateStr = (String) item.get("date");
            String startTimeStr = (String) item.get("startTime");
            String endTimeStr = (String) item.get("endTime");

            if (taskIdStr == null || dateStr == null || startTimeStr == null || endTimeStr == null) {
                log.warn("Invalid schedule item, skipping: {}", item);
                continue;
            }

            LocalDate date = LocalDate.parse(dateStr);
            LocalTime start = LocalTime.parse(startTimeStr);
            LocalTime end = LocalTime.parse(endTimeStr);
            UUID taskId = UUID.fromString(taskIdStr);

            ScheduledTask scheduled = new ScheduledTask();
            scheduled.setUser(user);
            scheduled.setScheduledDate(date);
            scheduled.setStartTime(start);
            scheduled.setEndTime(end);
            scheduled.setCompleted(false);
            scheduled.setReminderSent(false);

            // Find which type of task
            // Find which type of task and assign the correct priority
            if (roadmapTaskRepository.existsById(taskId)) {
                scheduled.setRoadmapTaskId(taskId);
                RoadmapTask rt = roadmapTaskRepository.findById(taskId).get();
                scheduled.setTitle(rt.getDescription());
                scheduled.setPriority("MEDIUM"); // Roadmap is default medium
            } else if (milestoneTaskRepository.existsById(taskId)) {
                scheduled.setMilestoneTaskId(taskId);
                Task mt = milestoneTaskRepository.findById(taskId).get();
                scheduled.setTitle(mt.getDescription());
                scheduled.setPriority(mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM");
            } else if (customTaskRepository.existsById(taskId)) {
                scheduled.setCustomTaskId(taskId);
                CustomTask ct = customTaskRepository.findById(taskId).get();
                scheduled.setTitle(ct.getTitle());
                scheduled.setPriority(ct.getPriority()); // Grab the actual Custom Task priority!
            } else {
                log.warn("Task ID {} not found in any repository", taskId);
                continue;
            }
            scheduledTaskRepository.save(scheduled);
            log.info("Saved scheduled task: {} on {}", scheduled.getTitle(), date);
        }
    }

    // New helper method
    private List<ScheduleTaskRequest.TaskItem> collectTasksByMode(User user, String mode) {
        if ("custom".equals(mode)) {
            // Only custom tasks, and only those not yet scheduled
            return collectUnscheduledCustomTasks(user);
        } else {
            // Full mode (all tasks)
            return collectUnscheduledTasks(user);
        }
    }

    private List<ScheduleTaskRequest.TaskItem> collectUnscheduledCustomTasks(User user) {
        List<ScheduleTaskRequest.TaskItem> items = new ArrayList<>();
        List<CustomTask> customTasks = customTaskRepository.findByUserAndCompletedFalse(user);
        for (CustomTask ct : customTasks) {
            // Check if already scheduled (optional: but we already deleted all custom-task scheduled entries, so none left)
            if (scheduledTaskRepository.findAll().stream()
                    .anyMatch(st -> ct.getId().equals(st.getCustomTaskId()))) {
                continue;
            }
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
    // Helper method for fallback scheduling
    // Replace your existing simpleSchedule method in ScheduleService.java with this:

    private List<Map<String, Object>> simpleSchedule(List<ScheduleTaskRequest.TaskItem> tasks,
                                                     Map<String, List<TimeSlot>> daySlots,
                                                     LocalDate startDate,
                                                     LocalTime currentTime) {
        List<Map<String, Object>> result = new ArrayList<>();
        int maxDays = 21;  // max 3 weeks ahead

        // Sort tasks: priority HIGH > MEDIUM > LOW, then by dueDate (earlier first)
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

                // If no slots for this day, move to next day
                if (slots == null || slots.isEmpty()) {
                    currentDayOffset++;
                    currentSlotIndex = 0;
                    currentTimeInSlot = null;
                    continue;
                }

                // If currentSlotIndex is out of bounds, reset to next day
                if (currentSlotIndex >= slots.size()) {
                    currentDayOffset++;
                    currentSlotIndex = 0;
                    currentTimeInSlot = null;
                    continue;
                }

                boolean isToday = currentDay.equals(startDate);

                // Get current slot (safe because index is within bounds)
                TimeSlot currentSlot = slots.get(currentSlotIndex);

                // Determine start time for this slot
                if (currentTimeInSlot == null) {
                    LocalTime proposedStart = currentSlot.getStart();
                    if (isToday && proposedStart.isBefore(currentTime)) {
                        // This slot is already past – move to the next slot
                        currentSlotIndex++;
                        continue;
                    }
                    currentTimeInSlot = proposedStart;
                }

                LocalTime proposedEnd = currentTimeInSlot.plusMinutes(estMinutes);

                // Check if task fits in current slot
                if (proposedEnd.isAfter(currentSlot.getEnd())) {
                    // Does not fit – move to next slot
                    currentSlotIndex++;
                    currentTimeInSlot = null;
                    continue;
                }

                // Double-check start time (for safety)
                if (isToday && currentTimeInSlot.isBefore(currentTime)) {
                    // Should not happen, but handle gracefully
                    currentTimeInSlot = currentTime;
                    proposedEnd = currentTimeInSlot.plusMinutes(estMinutes);
                    if (proposedEnd.isAfter(currentSlot.getEnd())) {
                        currentSlotIndex++;
                        currentTimeInSlot = null;
                        continue;
                    }
                }

                // Task fits – schedule it
                Map<String, Object> scheduleItem = new HashMap<>();
                scheduleItem.put("taskId", task.getId());
                scheduleItem.put("date", currentDay.toString());
                scheduleItem.put("startTime", currentTimeInSlot.toString());
                scheduleItem.put("endTime", proposedEnd.toString());
                result.add(scheduleItem);

                // Advance the clock within the same slot
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
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> hoursMap = mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
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
        // Default: weekdays 9-12 and 13-17
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

    // Inner class for time slot
    @Data
    static class TimeSlot {
        private LocalTime start;
        private LocalTime end;
        // getters/setters
    }
    private List<ScheduleTaskRequest.TaskItem> collectUnscheduledTasks(User user) {
        List<ScheduleTaskRequest.TaskItem> items = new ArrayList<>();

        // Roadmap tasks that are not completed and not already scheduled
        List<RoadmapTask> roadmapTasks = roadmapTaskRepository.findByRoadmap_User(user);
        for (RoadmapTask rt : roadmapTasks) {
            if (rt.isCompleted()) continue;
            if (scheduledTaskRepository.findAll().stream()
                    .anyMatch(st -> rt.getId().equals(st.getRoadmapTaskId()))) continue;
            ScheduleTaskRequest.TaskItem item = new ScheduleTaskRequest.TaskItem();
            item.setId(rt.getId().toString());
            item.setTitle(rt.getDescription());
            item.setEstimatedHours(estimateDuration(rt.getDetails(), rt.getDescription()));
            item.setDueDate(null); // no due date in roadmap tasks
            item.setPriority("MEDIUM");
            items.add(item);
        }

        // Milestone tasks
        List<Task> milestoneTasks = milestoneTaskRepository.findByMilestone_User(user);
        for (Task mt : milestoneTasks) {
            if (mt.getStatus() == Status.COMPLETED) continue;
            if (scheduledTaskRepository.findAll().stream()
                    .anyMatch(st -> mt.getId().equals(st.getMilestoneTaskId()))) continue;
            ScheduleTaskRequest.TaskItem item = new ScheduleTaskRequest.TaskItem();
            item.setId(mt.getId().toString());
            item.setTitle(mt.getDescription());
            item.setEstimatedHours(estimateDuration(mt.getDetails(), mt.getDescription()));
            item.setDueDate(mt.getDueDate() != null ? mt.getDueDate().toString() : null);
            item.setPriority(mt.getStatus() == Status.OVERDUE ? "HIGH" : "MEDIUM");
            items.add(item);
        }

        // Custom tasks not completed and not scheduled
        List<CustomTask> customTasks = customTaskRepository.findByUserAndCompletedFalse(user);
        for (CustomTask ct : customTasks) {
            if (scheduledTaskRepository.findAll().stream()
                    .anyMatch(st -> ct.getId().equals(st.getCustomTaskId()))) continue;
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

//    private Double estimateDuration(String details) {
//        // Simple fallback: 1 hour if no details, otherwise try to extract from text
//        if (details == null) return 1.0;
//        // Could call a simple AI or just return default
//        return 1.5;
//    }

    private Double estimateDuration(String details, String description) {
        if (details != null && details.length() > 100) return 2.0;
        if (description != null && (description.toLowerCase().contains("project") || description.toLowerCase().contains("review"))) return 2.0;
        if (details != null && details.length() > 50) return 1.5;
        return 1.0;
    }

    private UserPreferences createDefaultPreferences(User user) {
        UserPreferences prefs = new UserPreferences();
        prefs.setUser(user);
        // Default: weekday 9am-5pm
        String defaultHours = "{\"monday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"tuesday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"wednesday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"thursday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]],\"friday\":[[\"09:00\",\"12:00\"],[\"13:00\",\"17:00\"]]}";
        prefs.setAvailableHoursJson(defaultHours);
        prefs.setTimezone("Asia/Kolkata");
        return userPreferencesRepository.save(prefs);
    }
}