// src/main/java/com/mymindmirror.backend/service/TaskService.java
package com.mymindmirror.backend.service;

import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.RoadmapTask;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.RoadmapTaskRepository;
import com.mymindmirror.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final MilestoneService milestoneService; // To interact with Milestone logic
    private final RoadmapTaskRepository roadmapTaskRepository; // inject


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
        log.info("Creating new task for milestone {} for user {}", milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        Task task = new Task(milestone, description, dueDate);
        task.setStatus(Status.PENDING); // New tasks start as PENDING
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
        log.info("Fetching all tasks for milestone {} for user {}", milestoneId, user.getUsername());
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
        log.info("Fetching task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        List<Task> tasks = taskRepository.findByIdAndMilestone(taskId, milestone);
        if (tasks.isEmpty()) {
            log.warn("Task {} not found or not part of milestone {} for user {}", taskId, milestoneId, user.getUsername());
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
                           String newDescription, LocalDate newDueDate, Status newStatus) {
        log.info("Updating task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Task existingTask = getTaskByIdForMilestoneAndUser(taskId, milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));

        if (newDescription != null && !newDescription.trim().isEmpty()) {
            existingTask.setDescription(newDescription);
        }
        if (newDueDate != null) {
            existingTask.setDueDate(newDueDate);
        }
        if (newStatus != null) {
            Status oldStatus = existingTask.getStatus();
            existingTask.setStatus(newStatus);
            // If status changed to COMPLETED and there is a linked roadmap task, sync it
            if (oldStatus != Status.COMPLETED && newStatus == Status.COMPLETED) {
                if (existingTask.getRoadmapTaskId() != null) {
                    syncRoadmapTaskCompletion(existingTask.getRoadmapTaskId(), true);
                }
            }
            // If status changed away from COMPLETED (uncomplete), also sync
            if (oldStatus == Status.COMPLETED && newStatus != Status.COMPLETED) {
                if (existingTask.getRoadmapTaskId() != null) {
                    syncRoadmapTaskCompletion(existingTask.getRoadmapTaskId(), false);
                }
            }
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
        log.info("Deleting task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Task existingTask = getTaskByIdForMilestoneAndUser(taskId, milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));

        // Remove the task from the milestone's collection to avoid orphaned references
        Milestone milestone = existingTask.getMilestone();
        milestone.getTasks().remove(existingTask);

        // Now delete the task
        taskRepository.delete(existingTask);
        log.info("Task {} deleted successfully.", taskId);

        // Update milestone status after deletion
        milestoneService.updateMilestoneStatusBasedOnTasks(milestone.getId());
    }

    @Transactional
    public Task createTaskWithRoadmapLink(UUID milestoneId, User user, String description,
                                          LocalDate dueDate, UUID roadmapTaskId) {
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));
        Task task = new Task(milestone, description, dueDate);
        task.setStatus(Status.PENDING);
        task.setRoadmapTaskId(roadmapTaskId);
        Task savedTask = taskRepository.save(task);
        milestoneService.updateMilestoneStatusBasedOnTasks(milestone.getId());
        return savedTask;
    }

    private void syncRoadmapTaskCompletion(UUID roadmapTaskId, boolean completed) {
        RoadmapTask roadmapTask = roadmapTaskRepository.findById(roadmapTaskId).orElse(null);
        if (roadmapTask != null && roadmapTask.isCompleted() != completed) {
            roadmapTask.setCompleted(completed);
            roadmapTaskRepository.save(roadmapTask);
            log.info("Synced roadmap task {} completion to {}", roadmapTaskId, completed);
        }
    }

}
