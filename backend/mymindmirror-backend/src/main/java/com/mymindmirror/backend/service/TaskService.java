// src/main/java/com/mymindmirror.backend/service/TaskService.java
package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class for managing Task-related business logic.
 * Handles creating, retrieving, updating, and deleting tasks,
 * ensuring proper milestone and user ownership.
 */
@Service
public class TaskService {

    private static final Logger logger = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;
    private final MilestoneService milestoneService; // To interact with Milestone logic

    public TaskService(TaskRepository taskRepository, MilestoneService milestoneService) {
        this.taskRepository = taskRepository;
        this.milestoneService = milestoneService;
    }

    /**
     * Creates a new task for a specific milestone.
     * Ensures the milestone belongs to the authenticated user.
     * @param milestoneId The ID of the milestone to associate the task with.
     * @param user The authenticated user (for milestone ownership check).
     * @param description The description of the task.
     * @param dueDate The optional due date for the task.
     * @return The created Task entity.
     * @throws IllegalArgumentException if the milestone is not found or not owned by the user.
     */
    @Transactional
    public Task createTask(UUID milestoneId, User user, String description, LocalDate dueDate) {
        logger.info("Creating new task for milestone {} for user {}", milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        Task task = new Task(milestone, description, dueDate);
        task.setStatus(Task.Status.PENDING); // New tasks start as PENDING
        Task savedTask = taskRepository.save(task);

        // Update milestone status after adding a new task
        milestoneService.updateMilestoneStatusBasedOnTasks(milestone.getId());
        return savedTask;
    }

    /**
     * Retrieves all tasks for a specific milestone.
     * Ensures the milestone belongs to the authenticated user.
     * @param milestoneId The ID of the milestone.
     * @param user The authenticated user (for milestone ownership check).
     * @return A list of Task entities.
     * @throws IllegalArgumentException if the milestone is not found or not owned by the user.
     */
    public List<Task> getAllTasksForMilestone(UUID milestoneId, User user) {
        logger.info("Fetching all tasks for milestone {} for user {}", milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));
        return taskRepository.findByMilestoneOrderByCreationTimestampAsc(milestone);
    }

    /**
     * Retrieves a specific task by its ID for a given milestone and user.
     * Ensures that the task belongs to the specified milestone and the milestone belongs to the user.
     * @param taskId The ID of the task.
     * @param milestoneId The ID of the parent milestone.
     * @param user The authenticated user.
     * @return An Optional containing the Task if found and owned correctly.
     */
    public Optional<Task> getTaskByIdForMilestoneAndUser(UUID taskId, UUID milestoneId, User user) {
        logger.info("Fetching task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        List<Task> tasks = taskRepository.findByIdAndMilestone(taskId, milestone);
        if (tasks.isEmpty()) {
            logger.warn("Task {} not found or not part of milestone {} for user {}", taskId, milestoneId, user.getUsername());
            return Optional.empty();
        }
        return Optional.of(tasks.get(0)); // Should be at most one result
    }

    /**
     * Updates an existing task.
     * Ensures that the task belongs to the specified milestone and the milestone belongs to the user.
     * @param taskId The ID of the task to update.
     * @param milestoneId The ID of the parent milestone.
     * @param user The authenticated user.
     * @param newDescription The new description (optional).
     * @param newDueDate The new due date (optional).
     * @param newStatus The new status (optional).
     * @return The updated Task entity.
     * @throws IllegalArgumentException if the task or milestone is not found or not owned correctly.
     */
    @Transactional
    public Task updateTask(UUID taskId, UUID milestoneId, User user,
                           String newDescription, LocalDate newDueDate, Task.Status newStatus) {
        logger.info("Updating task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Task existingTask = getTaskByIdForMilestoneAndUser(taskId, milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));

        if (newDescription != null && !newDescription.trim().isEmpty()) {
            existingTask.setDescription(newDescription);
        }
        if (newDueDate != null) { // Allow setting to null to clear due date
            existingTask.setDueDate(newDueDate);
        }
        if (newStatus != null) {
            existingTask.setStatus(newStatus);
            // If task status changes, update parent milestone's status
            milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);
        }
        return taskRepository.save(existingTask);
    }

    /**
     * Deletes a task.
     * Ensures that the task belongs to the specified milestone and the milestone belongs to the user.
     * @param taskId The ID of the task to delete.
     * @param milestoneId The ID of the parent milestone.
     * @param user The authenticated user.
     * @throws IllegalArgumentException if the task or milestone is not found or not owned correctly.
     */
    @Transactional
    public void deleteTask(UUID taskId, UUID milestoneId, User user) {
        logger.info("Deleting task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Task existingTask = getTaskByIdForMilestoneAndUser(taskId, milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));

        taskRepository.delete(existingTask);
        logger.info("Task {} deleted successfully.", taskId);

        // Update milestone status after deleting a task
        milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);
    }
}
