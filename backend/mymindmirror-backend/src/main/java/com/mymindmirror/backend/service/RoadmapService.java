package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.mymindmirror.backend.model.*;
import com.mymindmirror.backend.payload.request.RoadmapGenerateRequest;
import com.mymindmirror.backend.payload.response.RoadmapGenerateResponse;
import com.mymindmirror.backend.payload.response.RoadmapResponse;
import com.mymindmirror.backend.repository.RoadmapRepository;
import com.mymindmirror.backend.repository.RoadmapTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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

    @Transactional
    public Roadmap generateRoadmap(User user, String goal, Integer timeframeWeeks) {
        String apiKey = apiKeyService.getDecryptedApiKey(user);
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal(goal);
        request.setTimeframeWeeks(timeframeWeeks);

        RoadmapGenerateResponse aiResponse = null;
        try {
            aiResponse = mlServiceWebClient.post()
                    .uri("/ml/roadmap/generate")
                    .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(RoadmapGenerateResponse.class)
                    .block();
        } catch (Exception e) {
            log.error("ML service call failed, using fallback roadmap: {}", e.getMessage());
        }

        // If AI response is null (failed), create a fallback response
        if (aiResponse == null) {
            aiResponse = createFallbackRoadmapResponse(goal, timeframeWeeks);
        }

        // Ensure collections are not null
        if (aiResponse.getTasks() == null) aiResponse.setTasks(new ArrayList<>());
        if (aiResponse.getResources() == null) aiResponse.setResources(new ArrayList<>());
        if (aiResponse.getMilestones() == null) aiResponse.setMilestones(new ArrayList<>());
        if (aiResponse.getPhases() == null) aiResponse.setPhases(new ArrayList<>());

        Roadmap roadmap = new Roadmap(user, aiResponse.getTitle(), goal, aiResponse.getDurationWeeks());

        // Map tasks
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

        // Map resources
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

        // Map milestones
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
        return roadmapRepository.save(roadmap);
    }

    private RoadmapGenerateResponse createFallbackRoadmapResponse(String goal, Integer timeframeWeeks) {
        RoadmapGenerateResponse fallback = new RoadmapGenerateResponse();
        fallback.setTitle("Your Personalized Roadmap to " + goal);
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
        taskRepository.save(task);  // save the flag

        String milestoneTitle = "Roadmap: " + roadmap.getTitle();
        Milestone milestone = milestoneService.getOrCreateMilestoneByTitle(user, milestoneTitle);

        // Use the new method
        taskService.createTaskWithRoadmapLink(milestone.getId(), user, task.getDescription(), null, task.getId());
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
            gamificationService.updateStreakAndBadges(user, true);
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

        // Collect completed task descriptions
        List<String> completedTasks = roadmap.getTasks().stream()
                .filter(RoadmapTask::isCompleted)
                .map(RoadmapTask::getDescription)
                .collect(Collectors.toList());

        if (completedTasks.isEmpty()) {
            throw new IllegalStateException("No completed tasks yet. Complete some tasks before continuing.");
        }

        String apiKey = apiKeyService.getDecryptedApiKey(user);
        Map<String, Object> request = Map.of(
                "goal", roadmap.getDescription(),
                "completedTasks", completedTasks,
                "currentTitle", roadmap.getTitle()
        );

        Map<String, Object> aiResponse = mlServiceWebClient.post()
                .uri("/ml/roadmap/continue")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (aiResponse == null || !aiResponse.containsKey("tasks")) {
            throw new RuntimeException("Failed to get continuation from AI");
        }

        List<Map<String, Object>> newTasks = (List<Map<String, Object>>) aiResponse.get("tasks");
        for (Map<String, Object> taskMap : newTasks) {
            RoadmapTask task = new RoadmapTask();
            task.setRoadmap(roadmap);
            task.setDescription((String) taskMap.get("description"));
            task.setDetails((String) taskMap.get("details"));
            task.setWeekNumber((Integer) taskMap.getOrDefault("week", 1));
            task.setDayNumber((Integer) taskMap.getOrDefault("day", 1));
            task.setTaskType((String) taskMap.getOrDefault("type", "daily"));
            task.setCompleted(false);
            Object subtasksObj = taskMap.get("subtasks");
            if (subtasksObj instanceof List) {
                try {
                    task.setSubtasks(objectMapper.writeValueAsString(subtasksObj));
                } catch (JsonProcessingException e) {
                    task.setSubtasks("[]");
                }
            }
            roadmap.getTasks().add(task);
        }

        roadmap = roadmapRepository.save(roadmap);
        // Convert to DTO while still inside transaction (collections are initialized)
        return toResponse(roadmap);
    }

    @Transactional
    public RoadmapTask elaborateTask(UUID taskId, User user, boolean enhance) {
        RoadmapTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        if (!task.getRoadmap().getUser().getId().equals(user.getId())) {
            throw new SecurityException("Not authorized");
        }

        String goal = task.getRoadmap().getDescription();
        String apiKey = apiKeyService.getDecryptedApiKey(user);

        Map<String, Object> request = Map.of(
                "goal", goal,
                "taskDescription", task.getDescription(),
                "enhance", enhance
        );

        Map<String, Object> aiResponse = mlServiceWebClient.post()
                .uri("/ml/roadmap/elaborate")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (aiResponse != null) {
            String details = (String) aiResponse.getOrDefault("details", task.getDescription());
            task.setDetails(details);
            Object subtasksObj = aiResponse.get("subtasks");
            if (subtasksObj instanceof List) {
                try {
                    task.setSubtasks(objectMapper.writeValueAsString(subtasksObj));
                } catch (JsonProcessingException e) {
                    task.setSubtasks("[]");
                }
            }
            // estimatedHours could be stored in a new column if needed
        } else {
            task.setDetails(task.getDescription());
            task.setSubtasks("[]");
        }
        return taskRepository.save(task);
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

        String apiKey = apiKeyService.getDecryptedApiKey(user);
        Map<String, Object> request = Map.of(
                "goal", roadmap.getDescription(),
                "originalDuration", roadmap.getDurationWeeks(),
                "completedTasks", completedTasks,
                "remainingTasks", remainingTasks
        );

        Map<String, Object> aiResponse = mlServiceWebClient.post()
                .uri("/ml/roadmap/reschedule")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (aiResponse == null) {
            throw new RuntimeException("Failed to get reschedule plan from AI");
        }

        Integer newDuration = (Integer) aiResponse.getOrDefault("newDurationWeeks", roadmap.getDurationWeeks());
        List<Map<String, Object>> taskUpdates = (List<Map<String, Object>>) aiResponse.getOrDefault("tasks", List.of());

        // Apply new week numbers
        for (Map<String, Object> update : taskUpdates) {
            Integer taskIndex = (Integer) update.get("taskId");
            Integer newWeek = (Integer) update.get("newWeek");
            if (taskIndex != null && newWeek != null && taskIndex >= 0 && taskIndex < remainingTasks.size()) {
                // Find the actual task by description (since descriptions should be unique enough)
                String desc = remainingTasks.get(taskIndex);
                allTasks.stream()
                        .filter(t -> t.getDescription().equals(desc))
                        .findFirst()
                        .ifPresent(t -> t.setWeekNumber(newWeek));
            }
        }

        roadmap.setDurationWeeks(newDuration);
        roadmap = roadmapRepository.save(roadmap);
        return toResponse(roadmap);
    }
}