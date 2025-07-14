// src/main/java/com/mymindmirror.backend/service/MilestoneService.java
package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task; // ⭐ Import Task to access Task.Status ⭐
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.MilestoneRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class for managing Milestone-related business logic.
 * Handles creating, retrieving, updating, and deleting milestones,
 * ensuring proper user ownership and data integrity.
 */
@Service
public class MilestoneService {

    private static final Logger logger = LoggerFactory.getLogger(MilestoneService.class);

    private final MilestoneRepository milestoneRepository;
    private final UserService userService; // To fetch User entities

    public MilestoneService(MilestoneRepository milestoneRepository, UserService userService) {
        this.milestoneRepository = milestoneRepository;
        this.userService = userService;
    }

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
        logger.info("Creating new milestone for user {}: {}", user.getUsername(), title);
        Milestone milestone = new Milestone(user, title, description, dueDate);
        milestone.setStatus(Milestone.Status.PENDING); // New milestones start as PENDING
        return milestoneRepository.save(milestone);
    }

    /**
     * Retrieves all milestones for a specific user, ordered by creation date descending.
     * @param user The authenticated user.
     * @return A list of Milestone entities.
     */
    public List<Milestone> getAllMilestonesForUser(User user) {
        logger.info("Fetching all milestones for user: {}", user.getUsername());
        return milestoneRepository.findByUserOrderByCreationDateDesc(user);
    }

    /**
     * Retrieves a specific milestone by its ID for a given user.
     * Ensures that the milestone belongs to the authenticated user.
     * @param milestoneId The ID of the milestone.
     * @param user The authenticated user.
     * @return An Optional containing the Milestone if found and owned by the user.
     */
    public Optional<Milestone> getMilestoneByIdForUser(UUID milestoneId, User user) {
        logger.info("Fetching milestone {} for user {}", milestoneId, user.getUsername());
        // Use findByIdAndUser to ensure ownership check
        List<Milestone> milestones = milestoneRepository.findByIdAndUser(milestoneId, user);
        if (milestones.isEmpty()) {
            logger.warn("Milestone {} not found or not owned by user {}", milestoneId, user.getUsername());
            return Optional.empty();
        }
        return Optional.of(milestones.get(0)); // Should be at most one result
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
                                     LocalDate newDueDate, Milestone.Status newStatus) {
        logger.info("Updating milestone {} for user {}", milestoneId, user.getUsername());
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
        logger.info("Deleting milestone {} for user {}", milestoneId, user.getUsername());
        Milestone existingMilestone = getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        milestoneRepository.delete(existingMilestone);
        logger.info("Milestone {} deleted successfully.", milestoneId);
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
                    .filter(task -> task.getStatus() == Task.Status.COMPLETED) // ⭐ FIXED HERE ⭐
                    .count();

            if (totalTasks == 0) {
                milestone.setStatus(Milestone.Status.PENDING); // Or PENDING_NO_TASKS
            } else if (completedTasks == totalTasks) {
                milestone.setStatus(Milestone.Status.COMPLETED);
            } else if (completedTasks > 0) {
                milestone.setStatus(Milestone.Status.IN_PROGRESS);
            } else {
                milestone.setStatus(Milestone.Status.PENDING);
            }

            // Check for overdue status
            if (milestone.getDueDate() != null && milestone.getDueDate().isBefore(LocalDate.now()) && milestone.getStatus() != Milestone.Status.COMPLETED) {
                milestone.setStatus(Milestone.Status.OVERDUE);
            }
            milestoneRepository.save(milestone);
            logger.info("Milestone {} status updated to {}.", milestoneId, milestone.getStatus());
        });
    }
}
