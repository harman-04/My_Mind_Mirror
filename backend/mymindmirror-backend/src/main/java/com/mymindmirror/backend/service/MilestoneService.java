// src/main/java/com/mymindmirror.backend/service/MilestoneService.java
package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.GrowthTipParseResponse;
import com.mymindmirror.backend.payload.response.GrowthTipTask;
import com.mymindmirror.backend.payload.response.MilestoneResponse;
import com.mymindmirror.backend.payload.response.TaskResponse;
import com.mymindmirror.backend.repository.MilestoneRepository;
import com.mymindmirror.backend.repository.TaskRepository;
import com.mymindmirror.backend.service.ai.DynamicAiClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class for managing Milestone-related business logic.
 * Handles creating, retrieving, updating, and deleting milestones,
 * ensuring proper user ownership and data integrity.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MilestoneService {


    private final MilestoneRepository milestoneRepository;
    private final UserService userService; // To fetch User entities
    private final TaskRepository taskRepository;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final DynamicAiClientService aiClientService;




    /**
     * Creates a new milestone for a specific user.
     * @param user The authenticated user.
     * @param title The title of the milestone.
     * @param description The description of the milestone.
     * @param dueDate The optional due date for the milestone.
     * @return The created Milestone entity.
     */
    @Transactional
    public Milestone createMilestone(User user, String title, String description, LocalDate dueDate) {
        log.info("Creating new milestone for user {}: {}", user.getUsername(), title);
        Milestone milestone = new Milestone(user, title, description, dueDate);
        milestone.setStatus(Status.PENDING); // New milestones start as PENDING
        return milestoneRepository.save(milestone);
    }

    /**
     * Retrieves all milestones for a specific user, ordered by creation date descending.
     * @param user The authenticated user.
     * @return A list of Milestone entities.
     */
    public List<Milestone> getAllMilestonesForUser(User user) {
        log.info("Fetching all milestones for user: {}", user.getUsername());
        return milestoneRepository.findByUserOrderByCreationDateDesc(user);
    }

    /**
     * Retrieves a specific milestone by its ID for a given user.
     * Ensures that the milestone belongs to the authenticated user.
     * @param milestoneId The ID of the milestone.
     * @param user The authenticated user.
     * @return An Optional containing the Milestone if found and owned by the user.
     */
    @Transactional(readOnly = true)
    public Optional<Milestone> getMilestoneByIdForUser(UUID milestoneId, User user) {
        log.info("Fetching milestone {} for user {}", milestoneId, user.getUsername());
        List<Milestone> milestones = milestoneRepository.findByIdAndUser(milestoneId, user);
        if (milestones.isEmpty()) {
            log.warn("Milestone {} not found or not owned by user {}", milestoneId, user.getUsername());
            return Optional.empty();
        }
        Milestone milestone = milestones.get(0);
        // Force initialization of the User proxy while session is open
        Hibernate.initialize(milestone.getUser());
        // Also initialize tasks if they are lazy (but they are already EAGER in your model)
        Hibernate.initialize(milestone.getTasks());
        return Optional.of(milestone);
    }
    /**
     * Updates an existing milestone.
     * Ensures that the milestone belongs to the authenticated user.
     * @param milestoneId The ID of the milestone to update.
     * @param user The authenticated user.
     * @param newTitle The new title (optional).
     * @param newDescription The new description (optional).
     * @param newDueDate The new due date (optional).
     * @param newStatus The new status (optional).
     * @return The updated Milestone entity.
     * @throws IllegalArgumentException if the milestone is not found or not owned by the user.
     */
    @Transactional
    public Milestone updateMilestone(UUID milestoneId, User user,
                                     String newTitle, String newDescription,
                                     LocalDate newDueDate, Status newStatus) {
        log.info("Updating milestone {} for user {}", milestoneId, user.getUsername());
        Milestone existingMilestone = getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        if (newTitle != null && !newTitle.trim().isEmpty()) {
            existingMilestone.setTitle(newTitle);
        }
        if (newDescription != null) { // Allow setting to null to clear description
            existingMilestone.setDescription(newDescription);
        }
        if (newDueDate != null) { // Allow setting to null to clear due date
            existingMilestone.setDueDate(newDueDate);
        }
        if (newStatus != null) {
            existingMilestone.setStatus(newStatus);
        }
        return milestoneRepository.save(existingMilestone);
    }

    /**
     * Deletes a milestone.
     * Ensures that the milestone belongs to the authenticated user.
     * @param milestoneId The ID of the milestone to delete.
     * @param user The authenticated user.
     * @throws IllegalArgumentException if the milestone is not found or not owned by the user.
     */
    @Transactional
    public void deleteMilestone(UUID milestoneId, User user) {
        log.info("Deleting milestone {} for user {}", milestoneId, user.getUsername());
        Milestone existingMilestone = getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        milestoneRepository.delete(existingMilestone);
        log.info("Milestone {} deleted successfully.", milestoneId);
    }

    /**
     * Updates the status of a milestone based on its tasks' completion.
     * This method can be called after a task's status changes.
     * @param milestoneId The ID of the milestone to update.
     */
    @Transactional
    public void updateMilestoneStatusBasedOnTasks(UUID milestoneId) {
        Optional<Milestone> milestoneOptional = milestoneRepository.findById(milestoneId);
        milestoneOptional.ifPresent(milestone -> {
            long totalTasks = milestone.getTasks().size();
            long completedTasks = milestone.getTasks().stream()
                    .filter(task -> task.getStatus() == Status.COMPLETED)
                    .count();

            if (totalTasks == 0) {
                milestone.setStatus(Status.PENDING); // Or PENDING_NO_TASKS
            } else if (completedTasks == totalTasks) {
                milestone.setStatus(Status.COMPLETED);
            } else if (completedTasks > 0) {
                milestone.setStatus(Status.IN_PROGRESS);
            } else {
                milestone.setStatus(Status.PENDING);
            }

            // Check for overdue status
            if (milestone.getDueDate() != null && milestone.getDueDate().isBefore(LocalDate.now()) && milestone.getStatus() != Status.COMPLETED) {
                milestone.setStatus(Status.OVERDUE);
            }
            milestoneRepository.save(milestone);
            log.info("Milestone {} status updated to {}.", milestoneId, milestone.getStatus());
        });
    }

    public Milestone getOrCreateMilestoneByTitle(User user, String title) {
        // Check if milestone with exact title already exists
        List<Milestone> existing = milestoneRepository.findByUserOrderByCreationDateDesc(user);
        for (Milestone m : existing) {
            if (m.getTitle().equals(title)) {
                return m;
            }
        }
        // Otherwise create new
        return createMilestone(user, title, "Auto-generated from roadmap", null);
    }

    @Transactional
    public List<Task> importGrowthTipAsTask(User user, String tipText) {
        // 1. Call AI to parse tip (using the dynamic client, not Flask)
        String prompt = buildParseGrowthTipPrompt(tipText);
        GrowthTipParseResponse response;
        try {
            // Added AITask.PARSE_GROWTH_TIP here!
            response = aiClientService.generateStructured(prompt, GrowthTipParseResponse.class, user.getId(), AITask.PARSE_GROWTH_TIP);
        } catch (Exception e) {
            log.error("Failed to parse growth tip via AI", e);
            throw new RuntimeException("Failed to parse growth tip: " + e.getMessage(), e);
        }

        if (response == null || response.tasks() == null || response.tasks().isEmpty()) {
            throw new RuntimeException("No tasks extracted from growth tip");
        }

        // 2. Get or create "AI Growth Tips" milestone
        Milestone milestone = getOrCreateMilestoneByTitle(user, "AI Growth Tips");

        List<Task> createdTasks = new ArrayList<>();

        // 3. Create a task for each extracted action item
        for (GrowthTipTask taskData : response.tasks()) {
            Task task = new Task();
            task.setMilestone(milestone);
            task.setDescription(taskData.title());
            task.setDetails(taskData.description());
            task.setStatus(Status.PENDING);
            task.setCreationTimestamp(LocalDateTime.now());

            if (taskData.subtasks() != null && !taskData.subtasks().isEmpty()) {
                try {
                    String subtasksJson = objectMapper.writeValueAsString(taskData.subtasks());
                    task.setSubtasksJson(subtasksJson);
                } catch (JsonProcessingException e) {
                    log.warn("Failed to serialize subtasks for task {}", taskData.title(), e);
                    task.setSubtasksJson("[]");
                }
            } else {
                task.setSubtasksJson(null);
            }

            createdTasks.add(taskRepository.save(task));
        }

        updateMilestoneStatusBasedOnTasks(milestone.getId());

        return createdTasks;
    }

    private String buildParseGrowthTipPrompt(String tipText) {
        return String.format("""
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
    {
        "tasks": [
            {
                "title": "task title",
                "description": "detailed explanation",
                "subtasks": ["step 1", "step 2", ...]
            },
            ...
        ]
    }

    Tip text:
    %s
    """, tipText);
    }

    @Transactional(readOnly = true)
    public List<MilestoneResponse> getAllMilestonesForUserAsDTO(User user) {
        List<Milestone> milestones = milestoneRepository.findByUserOrderByCreationDateDesc(user);
        return milestones.stream().map(this::toMilestoneResponse).collect(Collectors.toList());
    }

    public MilestoneResponse getMilestoneResponseById(UUID milestoneId, User user) {
        Milestone milestone = getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found"));
        return toMilestoneResponse(milestone);
    }

    public MilestoneResponse createMilestoneAsDTO(User user, String title, String description, LocalDate dueDate) {
        Milestone milestone = createMilestone(user, title, description, dueDate);
        return toMilestoneResponse(milestone);
    }

    public MilestoneResponse updateMilestoneAsDTO(UUID milestoneId, User user,
                                                  String title, String description,
                                                  LocalDate dueDate, Status status) {
        Milestone updated = updateMilestone(milestoneId, user, title, description, dueDate, status);
        return toMilestoneResponse(updated);
    }

    private MilestoneResponse toMilestoneResponse(Milestone milestone) {
        MilestoneResponse dto = new MilestoneResponse();
        dto.setId(milestone.getId());
        dto.setTitle(milestone.getTitle());
        dto.setDescription(milestone.getDescription());
        dto.setCreationDate(milestone.getCreationDate());
        dto.setDueDate(milestone.getDueDate());
        dto.setStatus(milestone.getStatus());
        dto.setCompletionPercentage(milestone.getCompletionPercentage());
        if (milestone.getTasks() != null) {
            List<TaskResponse> taskDTOs = milestone.getTasks().stream()
                    .map(this::toTaskResponse)
                    .collect(Collectors.toList());
            dto.setTasks(taskDTOs);
        }
        return dto;
    }

    private TaskResponse toTaskResponse(Task task) {
        TaskResponse dto = new TaskResponse();
        dto.setId(task.getId());
        dto.setDescription(task.getDescription());
        dto.setCreationTimestamp(task.getCreationTimestamp());
        dto.setDueDate(task.getDueDate());
        dto.setStatus(task.getStatus());
        dto.setDetails(task.getDetails());
        dto.setRoadmapTaskId(task.getRoadmapTaskId());
        if (task.getSubtasksJson() != null) {
            try {
                dto.setSubtasks(objectMapper.readValue(task.getSubtasksJson(),
                        new TypeReference<List<String>>() {}));
            } catch (JsonProcessingException e) {
                dto.setSubtasks(List.of());
            }
        } else {
            dto.setSubtasks(List.of());
        }
        return dto;
    }
}
