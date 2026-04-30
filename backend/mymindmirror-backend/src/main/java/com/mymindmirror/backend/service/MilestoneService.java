// src/main/java/com/mymindmirror.backend/service/MilestoneService.java
package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.MilestoneRepository;
import com.mymindmirror.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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
    public List<Task> importGrowthTipAsTask(User user, String tipText, String apiKey) {
        // 1. Call Flask to parse tip
        Map<String, Object> request = Map.of("tipText", tipText);
        Map<String, Object> response = webClient.post()
                .uri("/ml/milestone/parse-growth-tip")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        // 2. Extract tasks list (each task may have title, description, subtasks)
        List<Map<String, Object>> tasksList = (List<Map<String, Object>>) response.get("tasks");
        if (tasksList == null || tasksList.isEmpty()) {
            throw new RuntimeException("No tasks extracted from growth tip");
        }

        // 3. Get or create "AI Growth Tips" milestone
        Milestone milestone = getOrCreateMilestoneByTitle(user, "AI Growth Tips");

        List<Task> createdTasks = new ArrayList<>();

        // 4. Create a separate task for each action item
        for (Map<String, Object> taskData : tasksList) {
            String title = (String) taskData.getOrDefault("title", "Actionable Step");
            String description = (String) taskData.getOrDefault("description", "Review the original growth tip and take the first step.");
            Object subtasksObj = taskData.get("subtasks"); // can be List<String> or null

            Task task = new Task();
            task.setMilestone(milestone);
            task.setDescription(title);
            task.setDetails(description);
            task.setStatus(Status.PENDING);
            task.setCreationTimestamp(LocalDateTime.now());

            // Store subtasks as JSON if present
            if (subtasksObj instanceof List) {
                try {
                    String subtasksJson = objectMapper.writeValueAsString(subtasksObj);
                    task.setSubtasksJson(subtasksJson);
                } catch (JsonProcessingException e) {
                    log.warn("Failed to serialize subtasks for task {}", title, e);
                    task.setSubtasksJson("[]");
                }
            } else {
                task.setSubtasksJson(null);
            }

            createdTasks.add(taskRepository.save(task));
        }

        // 5. Update milestone status after adding tasks
        updateMilestoneStatusBasedOnTasks(milestone.getId());

        return createdTasks;
    }
}
