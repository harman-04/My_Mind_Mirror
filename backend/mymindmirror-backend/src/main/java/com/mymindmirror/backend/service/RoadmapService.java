package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.model.*;
import com.mymindmirror.backend.payload.request.RoadmapGenerateRequest;
import com.mymindmirror.backend.payload.response.*;
import com.mymindmirror.backend.repository.RoadmapRepository;
import com.mymindmirror.backend.repository.RoadmapTaskRepository;
import com.mymindmirror.backend.service.ai.DynamicAiClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoadmapService {

    private final WebClient mlServiceWebClient;
    private final RoadmapRepository roadmapRepository;
    private final ApiKeyService apiKeyService;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final MilestoneService milestoneService;
    private final TaskService taskService;
    private final RoadmapTaskRepository taskRepository;
    private final GamificationService gamificationService;
    private final DynamicAiClientService aiClientService;


    @Transactional
    public Roadmap generateRoadmap(User user, String goal, Integer timeframeWeeks, Integer timeframeValue, String timeframeUnit) throws JsonProcessingException {
        // Convert to weeks (same as before)
        int weeks;
        if (timeframeWeeks != null) {
            weeks = timeframeWeeks;
            timeframeValue = weeks;
            timeframeUnit = "WEEKS";
        } else if (timeframeValue != null && timeframeUnit != null) {
            weeks = convertToWeeks(timeframeValue, timeframeUnit);
        } else {
            weeks = 4;
            timeframeValue = 4;
            timeframeUnit = "WEEKS";
        }

        UserRoadmapPreferences prefs = userService.getRoadmapPreferences(user);
        int weeksToGenerate = Math.min(weeks, 12);
        String prompt = buildRoadmapPrompt(goal, weeks, weeksToGenerate,
                prefs.getDifficulty(), prefs.getLanguagePreference(),
                prefs.getLearningStyle(), prefs.getHoursPerWeek(), prefs.isAvoidWeekends());

        RoadmapGenerateResponse aiResponse = null;
        boolean isFallback = false;

        try {
            // Use the dynamic AI client instead of WebClient
            RoadmapGenerateResponse response = aiClientService.generateStructured(prompt, RoadmapGenerateResponse.class, user.getId(), AITask.ROADMAP_INITIAL);
            // The response already contains tasks, resources, milestones, title, durationWeeks
            aiResponse = response;

            // Basic validation – if tasks are missing, treat as fallback
            if (aiResponse.getTasks() == null || aiResponse.getTasks().isEmpty()) {
                isFallback = true;
            }
        } catch (Exception e) {
            log.error("Error calling AI for roadmap generation, using fallback", e);
            isFallback = true;
        }

        if (isFallback || aiResponse == null) {
            aiResponse = createFallbackRoadmapResponse(goal, weeks);
            aiResponse.setIsFallback(true);
        }

        // Ensure collections are not null
        if (aiResponse.getTasks() == null) aiResponse.setTasks(new ArrayList<>());
        if (aiResponse.getResources() == null) aiResponse.setResources(new ArrayList<>());
        if (aiResponse.getMilestones() == null) aiResponse.setMilestones(new ArrayList<>());
        // phases are optional – we may ignore them or keep empty

        Roadmap roadmap = new Roadmap(user, aiResponse.getTitle(), goal, weeks);
        roadmap.setOriginalDurationValue(timeframeValue);
        roadmap.setOriginalDurationUnit(timeframeUnit);

        int generated = isFallback ? 0 : weeksToGenerate;
        roadmap.setGeneratedWeeks(generated);

        // Map tasks (unchanged)
        if (aiResponse.getTasks() != null) {
            aiResponse.getTasks().forEach(taskDto -> {
                RoadmapTask task = new RoadmapTask();
                task.setRoadmap(roadmap);
                task.setDescription(taskDto.getDescription());
                task.setDayNumber(taskDto.getDay());
                task.setWeekNumber(taskDto.getWeek());
                task.setTaskType(taskDto.getType());
                task.setDetails(taskDto.getDetails());
                if (taskDto.getSubtasks() != null && !taskDto.getSubtasks().isEmpty()) {
                    try {
                        task.setSubtasks(objectMapper.writeValueAsString(taskDto.getSubtasks()));
                    } catch (JsonProcessingException e) {
                        throw new RuntimeException(e);
                    }
                }
                roadmap.getTasks().add(task);
            });
        }

        // Map resources (unchanged)
        if (aiResponse.getResources() != null) {
            aiResponse.getResources().forEach(resDto -> {
                RoadmapResource res = new RoadmapResource();
                res.setRoadmap(roadmap);
                res.setName(resDto.getName());
                res.setUrl(resDto.getUrl());
                res.setType(resDto.getType());
                roadmap.getResources().add(res);
            });
        }

        // Map milestones (unchanged)
        if (aiResponse.getMilestones() != null) {
            aiResponse.getMilestones().forEach(milDto -> {
                RoadmapMilestone mil = new RoadmapMilestone();
                mil.setRoadmap(roadmap);
                mil.setName(milDto.getName());
                mil.setWeekNumber(milDto.getWeek());
                roadmap.getMilestones().add(mil);
            });
        }

        roadmap.setStatus("ACTIVE");

        // 💡 NEW: Reward for architecting a future plan!
        gamificationService.recordActivity(user, "ROADMAP_GENERATE");

        return roadmapRepository.save(roadmap);
    }

    private String buildRoadmapPrompt(String goal, int weeks, int weeksToGenerate, String difficulty, String language,
                                      String learningStyle, int hoursPerWeek, boolean avoidWeekends) {
        return String.format("""
    You are an expert mentor. Create a detailed, actionable JSON roadmap for the goal: "%s" within %d weeks.
    **You only need to generate detailed tasks for the first %d weeks**.
    For each of those weeks, provide 3-5 daily tasks (Monday‑Friday, day 1-5) with descriptions, details, and subtasks.

    **User Preferences:**
    - Difficulty: %s
    - Language: %s
    - Learning style: %s
    - Hours/week: %d
    - Avoid weekends: %s

    **Output Requirements (STRICT):**
    - JSON must contain these fields at the root level: title, durationWeeks, tasks, resources, milestones.
    - "tasks" MUST be a flat array of objects. Do NOT nest tasks inside "phases" or "weeks".
    - Each task object must have:
      - week (integer, 1..%d)
      - day (integer 1-5 for daily tasks, or null for weekly review)
      - description (short action)
      - details (longer instructions)
      - subtasks (array of strings)
      - type ("daily" or "weekly")
    - "resources": array of objects with "name", "url", "type" (relevant to the goal).
    - "milestones": array of objects with "name", "week", "criteria" (descriptive, e.g. "Understand Spring AI core concepts").
    - Use real resource URLs.
    - Return ONLY valid JSON, no extra text.
    """, goal, weeks, weeksToGenerate, difficulty, language, learningStyle, hoursPerWeek, avoidWeekends, weeksToGenerate);
    }

    private int convertToWeeks(int value, String unit) {
        switch (unit.toUpperCase()) {
            case "DAYS":
                return Math.max(1, value / 7);
            case "MONTHS":
                return value * 4;
            case "YEARS":
                return value * 52;
            default:
                return value;
        }
    }
    private RoadmapGenerateResponse createFallbackRoadmapResponse(String goal, Integer timeframeWeeks) {
        RoadmapGenerateResponse fallback = new RoadmapGenerateResponse();
        fallback.setTitle("Your Personalized Roadmap to " + goal);
        fallback.setIsFallback(true);
        fallback.setDurationWeeks(timeframeWeeks != null ? timeframeWeeks : 4);

        // Create simple tasks
        List<RoadmapGenerateResponse.Task> tasks = new ArrayList<>();
        tasks.add(createTask(1, 1, "Research the best resources for " + goal, "daily", "Explore official docs and tutorials.", List.of("Find 3 resources", "Bookmark them")));
        tasks.add(createTask(2, 1, "Set up your learning environment", "daily", "Install required software.", List.of()));
        tasks.add(createTask(3, 1, "Complete first module on " + goal, "daily", "Follow a structured course.", List.of()));
        tasks.add(createTask(4, 1, "Practice with a small exercise", "daily", "Apply what you learned.", List.of()));
        tasks.add(createTask(5, 1, "Review and plan next week", "daily", "Reflect on progress.", List.of()));
        fallback.setTasks(tasks);

        // Simple resources
        List<RoadmapGenerateResponse.Resource> resources = new ArrayList<>();
        resources.add(createResource("Google: " + goal + " tutorials", "https://www.google.com/search?q=" + goal.replace(" ", "+") + "+tutorial", "search"));
        resources.add(createResource("YouTube: " + goal + " for beginners", "https://www.youtube.com/results?search_query=" + goal.replace(" ", "+") + "+beginner", "video"));
        resources.add(createResource("Coursera: " + goal + " courses", "https://www.coursera.org/search?query=" + goal.replace(" ", "+"), "course"));
        fallback.setResources(resources);

        // Simple milestones
        int weeks = timeframeWeeks != null ? timeframeWeeks : 4;
        List<RoadmapGenerateResponse.Milestone> milestones = new ArrayList<>();
        milestones.add(createMilestone("Foundation of " + goal + " completed", Math.max(1, weeks / 3)));
        milestones.add(createMilestone("First project finished", Math.max(1, 2 * weeks / 3)));
        milestones.add(createMilestone("Ready to advance in " + goal, weeks));
        fallback.setMilestones(milestones);

        return fallback;
    }

    private RoadmapGenerateResponse.Task createTask(Integer day, Integer week, String description, String type, String details, List<String> subtasks) {
        RoadmapGenerateResponse.Task task = new RoadmapGenerateResponse.Task();
        task.setDay(day);
        task.setWeek(week);
        task.setDescription(description);
        task.setType(type);
        task.setDetails(details);
        task.setSubtasks(subtasks);
        return task;
    }

    private RoadmapGenerateResponse.Resource createResource(String name, String url, String type) {
        RoadmapGenerateResponse.Resource resource = new RoadmapGenerateResponse.Resource();
        resource.setName(name);
        resource.setUrl(url);
        resource.setType(type);
        return resource;
    }

    private RoadmapGenerateResponse.Milestone createMilestone(String name, Integer week) {
        RoadmapGenerateResponse.Milestone milestone = new RoadmapGenerateResponse.Milestone();
        milestone.setName(name);
        milestone.setWeek(week);
        return milestone;
    }




    @Transactional(readOnly = true)
    public List<RoadmapResponse> getUserRoadmaps(User user) {
        List<Roadmap> roadmaps = roadmapRepository.findByUserOrderByCreatedAtDesc(user);
        return roadmaps.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public RoadmapResponse toResponse(Roadmap roadmap) {
        RoadmapResponse response = new RoadmapResponse();
        response.setId(roadmap.getId());
        response.setTitle(roadmap.getTitle());
        response.setDescription(roadmap.getDescription());
        response.setCreatedAt(roadmap.getCreatedAt());
        response.setStatus(roadmap.getStatus());
        response.setDurationWeeks(roadmap.getDurationWeeks());
        response.setGeneratedWeeks(roadmap.getGeneratedWeeks());
        response.setOriginalDurationValue(roadmap.getOriginalDurationValue());
        response.setOriginalDurationUnit(roadmap.getOriginalDurationUnit());

        // Convert tasks
        if (roadmap.getTasks() != null) {
            List<RoadmapResponse.TaskDto> taskDtos = roadmap.getTasks().stream()
                    .map(this::toTaskDto)
                    .collect(Collectors.toList());
            response.setTasks(taskDtos);
        }

        // Convert resources
        if (roadmap.getResources() != null) {
            List<RoadmapResponse.ResourceDto> resourceDtos = roadmap.getResources().stream()
                    .map(this::toResourceDto)
                    .collect(Collectors.toList());
            response.setResources(resourceDtos);
        }

        // Convert milestones
        if (roadmap.getMilestones() != null) {
            List<RoadmapResponse.MilestoneDto> milestoneDtos = roadmap.getMilestones().stream()
                    .map(this::toMilestoneDto)
                    .collect(Collectors.toList());
            response.setMilestones(milestoneDtos);
        }

        return response;
    }

    private RoadmapResponse.TaskDto toTaskDto(RoadmapTask task) {
        RoadmapResponse.TaskDto dto = new RoadmapResponse.TaskDto();
        dto.setId(task.getId());
        dto.setDescription(task.getDescription());
        dto.setDayNumber(task.getDayNumber());
        dto.setWeekNumber(task.getWeekNumber());
        dto.setCompleted(task.isCompleted());
        dto.setTaskType(task.getTaskType());
        dto.setDetails(task.getDetails());
        dto.setImportedToMilestone(task.getImportedToMilestone());
        if (task.getSubtasks() != null) {
            try {
                dto.setSubtasks(objectMapper.readValue(task.getSubtasks(), new TypeReference<List<String>>() {}));
            } catch (JsonProcessingException e) {
                dto.setSubtasks(List.of());
            }
        } else {
            dto.setSubtasks(List.of());
        }
        return dto;
    }

    private RoadmapResponse.ResourceDto toResourceDto(RoadmapResource resource) {
        RoadmapResponse.ResourceDto dto = new RoadmapResponse.ResourceDto();
        dto.setId(resource.getId());
        dto.setName(resource.getName());
        dto.setUrl(resource.getUrl());
        dto.setType(resource.getType());
        return dto;
    }

    private RoadmapResponse.MilestoneDto toMilestoneDto(RoadmapMilestone milestone) {
        RoadmapResponse.MilestoneDto dto = new RoadmapResponse.MilestoneDto();
        dto.setId(milestone.getId());
        dto.setName(milestone.getName());
        dto.setWeekNumber(milestone.getWeekNumber());
        dto.setAchieved(milestone.isAchieved());
        return dto;
    }
    @Transactional
    public void deleteRoadmap(UUID roadmapId, User user) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new IllegalArgumentException("Roadmap not found"));
        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized to delete this roadmap");
        }
        roadmapRepository.delete(roadmap);
    }

    @Transactional
    public void importTaskToMilestone(UUID roadmapId, UUID taskId, User user) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new IllegalArgumentException("Roadmap not found"));
        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }
        RoadmapTask task = roadmap.getTasks().stream()
                .filter(t -> t.getId().equals(taskId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Task not found in roadmap"));

        // Mark as imported
        task.setImportedToMilestone(true);
        taskRepository.save(task);

        String milestoneTitle = "Roadmap: " + roadmap.getTitle();
        Milestone milestone = milestoneService.getOrCreateMilestoneByTitle(user, milestoneTitle);

        // Copy details and subtasks from RoadmapTask to Task
        String details = task.getDetails();
        String subtasksJson = task.getSubtasks();  // note: RoadmapTask uses "subtasks", Task uses "subtasksJson"

        taskService.createTaskWithRoadmapLink(
                milestone.getId(), user,
                task.getDescription(), null,
                task.getId(),
                details,
                subtasksJson
        );
    }

    @Transactional
    public void toggleTaskCompletion(UUID taskId, User user) {
        RoadmapTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        if (!task.getRoadmap().getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }
        boolean wasCompleted = task.isCompleted();
        task.setCompleted(!wasCompleted);
        taskRepository.save(task);

        // If task was completed (just became true), update gamification
        if (!wasCompleted && task.isCompleted()) {
            gamificationService.recordActivity(user, "TASK");
            // Check if all tasks in this roadmap are now completed
            Roadmap roadmap = task.getRoadmap();
            boolean allCompleted = roadmap.getTasks().stream().allMatch(RoadmapTask::isCompleted);
            if (allCompleted) {
                gamificationService.awardRoadmapCompletedBadge(user);
            }
        }
    }

    @Transactional
    public RoadmapResponse continueRoadmap(UUID roadmapId, User user) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new IllegalArgumentException("Roadmap not found"));
        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }

        // 1. Get completed tasks (same as before)
        List<String> completedTasks = roadmap.getTasks().stream()
                .filter(RoadmapTask::isCompleted)
                .map(RoadmapTask::getDescription)
                .collect(Collectors.toList());

        if (completedTasks.isEmpty()) {
            throw new IllegalStateException("No completed tasks yet. Complete some tasks before continuing.");
        }

        // 2. Determine the current highest week number
        int currentWeek = roadmap.getTasks().stream()
                .mapToInt(t -> t.getWeekNumber() != null ? t.getWeekNumber() : 1)
                .max()
                .orElse(0);

        // 3. We'll generate 3 weeks of tasks
        int weeksToGenerate = 3;
        int startWeek = currentWeek + 1;
        int endWeek = startWeek + weeksToGenerate - 1;

        // 4. Build prompt with current week info
        String prompt = buildContinueByProgressPrompt(
                roadmap.getDescription(),
                completedTasks,
                roadmap.getTitle(),
                currentWeek,
                startWeek,
                endWeek
        );

        // 5. Call AI
        RoadmapContinuationResponse aiResponse;
        try {
            aiResponse = aiClientService.generateStructured(prompt, RoadmapContinuationResponse.class, user.getId(), AITask.ROADMAP_NEXT_STEPS);
        } catch (Exception e) {
            log.error("Failed to get continuation from AI", e);
            throw new RuntimeException("Failed to get continuation from AI");
        }

        if (aiResponse == null || aiResponse.tasks() == null || aiResponse.tasks().isEmpty()) {
            throw new RuntimeException("AI returned no tasks for continuation");
        }

        // 6. Add new tasks
        for (RoadmapGenerateResponse.Task taskDto : aiResponse.tasks()) {
            RoadmapTask task = new RoadmapTask();
            task.setRoadmap(roadmap);
            task.setDescription(taskDto.getDescription());
            task.setDetails(taskDto.getDetails());
            task.setWeekNumber(taskDto.getWeek());          // AI should return week within startWeek..endWeek
            task.setDayNumber(taskDto.getDay());
            task.setTaskType(taskDto.getType());
            task.setCompleted(false);
            if (taskDto.getSubtasks() != null && !taskDto.getSubtasks().isEmpty()) {
                try {
                    task.setSubtasks(objectMapper.writeValueAsString(taskDto.getSubtasks()));
                } catch (JsonProcessingException e) {
                    task.setSubtasks("[]");
                }
            }
            roadmap.getTasks().add(task);
        }

        // 7. Update duration weeks if new weeks go beyond current duration
        int newMaxWeek = roadmap.getTasks().stream()
                .mapToInt(t -> t.getWeekNumber() != null ? t.getWeekNumber() : 1)
                .max()
                .orElse(roadmap.getDurationWeeks());
        if (newMaxWeek > roadmap.getDurationWeeks()) {
            roadmap.setDurationWeeks(newMaxWeek);
        }

        roadmap = roadmapRepository.save(roadmap);
        return toResponse(roadmap);
    }
    private String buildContinueByProgressPrompt(String goal, List<String> completedTasks, String currentTitle,
                                                 int currentWeek, int startWeek, int endWeek) {
        return String.format("""
    You are an expert mentor continuing a roadmap for the goal: "%s". The roadmap title is "%s".
    The user has completed the following tasks:
    %s

    The roadmap currently has tasks planned up to week %d.
    Now generate detailed, actionable tasks for weeks %d to %d (the next %d weeks).
    Each week should have 3‑5 daily tasks (Monday‑Friday, days 1‑5).

    **IMPORTANT:** 
    - Do NOT repeat tasks that are already completed.
    - The tasks must be for weeks %d, %d, and %d respectively.
    - Continue logically from where the previous weeks ended.

    Return ONLY JSON with the following structure:
    {
        "tasks": [
            {
                "week": %d,
                "day": 1,
                "description": "...",
                "details": "...",
                "subtasks": ["step1", "step2"],
                "type": "daily"
            },
            ...
        ]
    }
    If the goal seems already achieved, return an empty tasks array.
    """, goal, currentTitle, String.join("\n", completedTasks),
                currentWeek, startWeek, endWeek, (endWeek - startWeek + 1),
                startWeek, startWeek+1, startWeek+2,
                startWeek);
    }

    @Transactional
    public RoadmapTask elaborateTask(UUID taskId, User user, boolean enhance) {
        RoadmapTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        if (!task.getRoadmap().getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }

        String goal = task.getRoadmap().getDescription();
        String prompt = buildElaboratePrompt(goal, task.getDescription(), enhance);

        ElaborationResponse aiResponse;
        try {
            aiResponse = aiClientService.generateStructured(prompt, ElaborationResponse.class, user.getId(), AITask.ROADMAP_ELABORATION);
        } catch (Exception e) {
            log.error("Failed to get elaboration from AI", e);
            // Fallback: keep existing details (or set placeholder)
            task.setDetails(task.getDescription());
            task.setSubtasks("[]");
            return taskRepository.save(task);
        }

        if (aiResponse != null) {
            task.setDetails(aiResponse.details());
            if (aiResponse.subtasks() != null && !aiResponse.subtasks().isEmpty()) {
                try {
                    task.setSubtasks(objectMapper.writeValueAsString(aiResponse.subtasks()));
                } catch (JsonProcessingException e) {
                    task.setSubtasks("[]");
                }
            } else {
                task.setSubtasks("[]");
            }
            // estimatedHours could be stored in a new column if needed (not used currently)
        } else {
            task.setDetails(task.getDescription());
            task.setSubtasks("[]");
        }

        // 💡 NEW: Reward for deep-diving into learning!
        gamificationService.recordActivity(user, "ELABORATE_TASK");
        return taskRepository.save(task);
    }

    private String buildElaboratePrompt(String goal, String taskDescription, boolean enhance) {
        if (enhance) {
            return String.format("""
        You are an expert mentor. The user is following a roadmap for the goal: "%s".
        One task in that roadmap is: "%s".
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
        {
            "details": "very detailed explanation...",
            "subtasks": ["subtask 1", "subtask 2", ...],
            "estimatedHours": 3.5
        }
        """, goal, taskDescription);
        } else {
            return String.format("""
        You are an expert mentor. The user is following a roadmap for the goal: "%s".
        One task in that roadmap is: "%s".

        **Language & Style Instruction:**
        - Detect the language(s) and style of the goal and task description.
        - Generate the details and subtasks in the **same language(s) and style**.

        Provide a detailed elaboration for this task. Include:
        - A longer, step‑by‑step explanation (details)
        - A list of 2‑4 concrete subtasks (as an array of strings)
        - Estimated time to complete (in hours, e.g., 1.5)

        Return ONLY valid JSON with this structure:
        {
            "details": "step-by-step explanation...",
            "subtasks": ["subtask 1", "subtask 2", ...],
            "estimatedHours": 1.5
        }
        """, goal, taskDescription);
        }
    }

    @Transactional
    public RoadmapResponse rescheduleRoadmap(UUID roadmapId, User user) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new IllegalArgumentException("Roadmap not found"));
        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }

        List<RoadmapTask> allTasks = roadmap.getTasks();
        List<String> completedTasks = allTasks.stream()
                .filter(RoadmapTask::isCompleted)
                .map(RoadmapTask::getDescription)
                .collect(Collectors.toList());
        List<String> remainingTasks = allTasks.stream()
                .filter(t -> !t.isCompleted())
                .map(RoadmapTask::getDescription)
                .collect(Collectors.toList());

        if (remainingTasks.isEmpty()) {
            throw new IllegalStateException("All tasks are already completed.");
        }

        String prompt = buildReschedulePrompt(roadmap.getDescription(), roadmap.getDurationWeeks(),
                completedTasks, remainingTasks);

        RescheduleResponse aiResponse;
        try {
            aiResponse = aiClientService.generateStructured(prompt, RescheduleResponse.class, user.getId(), AITask.ROADMAP_RESCHEDULE);
        } catch (Exception e) {
            log.error("Failed to get reschedule plan from AI", e);
            throw new RuntimeException("Failed to get reschedule plan from AI");
        }

        if (aiResponse == null) {
            throw new RuntimeException("AI returned null reschedule response");
        }

        Integer newDuration = aiResponse.newDurationWeeks();
        if (newDuration != null && newDuration > 0) {
            roadmap.setDurationWeeks(newDuration);
        }

        // Apply new week numbers
        if (aiResponse.tasks() != null) {
            for (RescheduleResponse.TaskUpdate update : aiResponse.tasks()) {
                Integer taskIndex = update.taskId();
                Integer newWeek = update.newWeek();
                if (taskIndex != null && newWeek != null && taskIndex >= 0 && taskIndex < remainingTasks.size()) {
                    String desc = remainingTasks.get(taskIndex);
                    allTasks.stream()
                            .filter(t -> t.getDescription().equals(desc))
                            .findFirst()
                            .ifPresent(t -> t.setWeekNumber(newWeek));
                }
            }
        }

        roadmap = roadmapRepository.save(roadmap);
        return toResponse(roadmap);
    }

    private String buildReschedulePrompt(String goal, int originalDuration,
                                         List<String> completedTasks, List<String> remainingTasks) {
        return String.format("""
    You are an expert mentor. The user has a roadmap for the goal: "%s" originally planned for %d weeks.
    They have completed the following tasks: %s
    They still have these remaining tasks: %s

    **Language & Style Instruction:**
    - Detect the language(s) and style of the original goal and tasks.
    - Generate the revised schedule notes (newDurationWeeks) in the same language, but the output is mostly numeric and indices, so minimal text.

    Based on their progress, suggest a **revised weekly schedule** for the remaining tasks.
    Return ONLY JSON with the following structure:
    {
        "newDurationWeeks": integer,
        "tasks": [
            {
                "taskId": integer (index of the task in remaining_tasks list, starting from 0),
                "newWeek": integer (1‑based week number)
            }
        ]
    }
    Only include tasks that need a new week assignment. If no change needed, return empty tasks array.
    """, goal, originalDuration,
                completedTasks.toString(), remainingTasks.toString());
    }

    @Transactional
    public RoadmapResponse continueRoadmapBatch(UUID roadmapId, User user, Integer weeksToGenerate) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new IllegalArgumentException("Roadmap not found"));
        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }
        if (roadmap.isFullyGenerated()) {
            throw new IllegalStateException("Roadmap already fully generated");
        }

        int totalWeeks = roadmap.getDurationWeeks();
        int currentGenerated = roadmap.getGeneratedWeeks() != null ? roadmap.getGeneratedWeeks() : 0;
        int remainingWeeks = totalWeeks - currentGenerated;
        if (remainingWeeks <= 0) {
            throw new IllegalStateException("No weeks left to generate");
        }

        int chunkSize = (weeksToGenerate != null && weeksToGenerate > 0) ? weeksToGenerate : Math.min(remainingWeeks, 12);
        int startWeek = currentGenerated + 1;
        int endWeek = Math.min(startWeek + chunkSize - 1, totalWeeks);
        int weeksToGenerateNow = endWeek - startWeek + 1;

        // Delete any existing tasks for the target weeks (to avoid duplicates)
        List<RoadmapTask> tasksToDelete = roadmap.getTasks().stream()
                .filter(t -> t.getWeekNumber() != null && t.getWeekNumber() >= startWeek && t.getWeekNumber() <= endWeek)
                .collect(Collectors.toList());
        roadmap.getTasks().removeAll(tasksToDelete);
        taskRepository.deleteAll(tasksToDelete);

        // --- Build summary of previous weeks for AI context ---
        StringBuilder previousWeeksSummary = new StringBuilder();
        if (currentGenerated > 0) {
            List<RoadmapTask> previousTasks = roadmap.getTasks().stream()
                    .filter(t -> t.getWeekNumber() != null && t.getWeekNumber() <= currentGenerated)
                    .sorted(Comparator.comparingInt(RoadmapTask::getWeekNumber)
                            .thenComparingInt(t -> t.getDayNumber() != null ? t.getDayNumber() : 0))
                    .collect(Collectors.toList());
            int lastWeek = 0;
            for (RoadmapTask task : previousTasks) {
                if (task.getWeekNumber() != lastWeek) {
                    lastWeek = task.getWeekNumber();
                    previousWeeksSummary.append("Week ").append(lastWeek).append(":\n");
                }
                previousWeeksSummary.append("  - ").append(task.getDescription()).append("\n");
            }
        } else {
            previousWeeksSummary.append("No previous weeks. Start from week 1.");
        }


        UserRoadmapPreferences prefs = userService.getRoadmapPreferences(user);

        // Build prompt
        String prompt = buildContinuationPrompt(
                roadmap.getDescription(),
                currentGenerated,
                weeksToGenerateNow,
                totalWeeks,
                previousWeeksSummary.toString(),
                prefs.getDifficulty(),
                prefs.getLanguagePreference(),
                prefs.getLearningStyle(),
                prefs.getHoursPerWeek(),
                prefs.isAvoidWeekends()
        );

        RoadmapContinuationResponse aiResponse;
        try {
            aiResponse = aiClientService.generateStructured(prompt, RoadmapContinuationResponse.class, user.getId(), AITask.ROADMAP_EXTENSION);
        } catch (Exception e) {
            log.error("Failed to get continuation from AI", e);
            throw new RuntimeException("Continuation failed: " + e.getMessage(), e);
        }

        if (aiResponse == null || aiResponse.tasks() == null || aiResponse.tasks().isEmpty()) {
            throw new RuntimeException("AI returned no tasks for continuation");
        }

        // Map new tasks (similar to existing code)
        for (RoadmapGenerateResponse.Task taskDto : aiResponse.tasks()) {
            RoadmapTask task = new RoadmapTask();
            task.setRoadmap(roadmap);
            task.setDescription(taskDto.getDescription());
            task.setDetails(taskDto.getDetails());
            task.setWeekNumber(taskDto.getWeek());
            task.setDayNumber(taskDto.getDay());
            task.setTaskType(taskDto.getType());
            task.setCompleted(false);
            if (taskDto.getSubtasks() != null && !taskDto.getSubtasks().isEmpty()) {
                try {
                    task.setSubtasks(objectMapper.writeValueAsString(taskDto.getSubtasks()));
                } catch (JsonProcessingException e) {
                    task.setSubtasks("[]");
                }
            }
            roadmap.getTasks().add(task);
        }

        // Update generatedWeeks
        roadmap.setGeneratedWeeks(endWeek);
        roadmapRepository.save(roadmap);
        return toResponse(roadmap);
    }

    private String buildContinuationPrompt(String goal, int currentWeek, int weeksToGenerate, int totalWeeks,
                                           String previousSummary, String difficulty, String language,
                                           String learningStyle, int hoursPerWeek, boolean avoidWeekends) {
        int startWeek = currentWeek + 1;
        int endWeek = startWeek + weeksToGenerate - 1;
        return String.format("""
    You are an expert mentor continuing a roadmap for the goal: "%s".

    The roadmap spans %d weeks. Weeks 1 to %d have already been planned.

    **Topics already covered in previous weeks:**
    %s

    Now generate detailed, actionable tasks for weeks %d to %d.
    Each week should have 3‑5 daily tasks (Monday‑Friday, days 1‑5).
    **IMPORTANT:** Do NOT repeat topics that have already been covered in the previous weeks. Continue logically from where the previous weeks ended, introducing new concepts and building on what was learned.

    **User Preferences:**
    - Difficulty: %s
    - Language: %s – output ALL text in this language.
    - Learning style: %s
    - Hours per week available: %d
    - Avoid weekends: %s

    **Output Requirements:**
    Return a JSON object with a "tasks" array. Each task must have:
    - week (integer, between %d and %d)
    - day (integer 1‑7 for daily tasks; null for weekly tasks)
    - description (short action)
    - details (longer instructions, resources)
    - subtasks (array of strings)
    - type ("daily" or "weekly")

    Use the same language and style as the original goal.
    Do NOT include tasks for weeks outside the requested range.
    Return ONLY valid JSON, no extra text.
    """, goal, totalWeeks, currentWeek, previousSummary, startWeek, endWeek,
                difficulty, language, learningStyle, hoursPerWeek, avoidWeekends,
                startWeek, endWeek);
    }
}