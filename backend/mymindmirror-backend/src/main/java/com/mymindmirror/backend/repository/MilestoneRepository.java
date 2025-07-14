// src/main/java/com/mymindmirror/backend/repository/MilestoneRepository.java
package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for Milestone entities.
 * Provides methods for CRUD operations and fetching milestones by user.
 */
@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {

    /**
     * Finds all milestones belonging to a specific user, ordered by creation date descending.
     * @param user The user whose milestones to retrieve.
     * @return A list of milestones.
     */
    List<Milestone> findByUserOrderByCreationDateDesc(User user);

    /**
     * Finds a milestone by its ID and the owning user.
     * This ensures that a user can only access their own milestones.
     * @param id The ID of the milestone.
     * @param user The owning user.
     * @return An Optional containing the milestone if found and owned by the user.
     */
    List<Milestone> findByIdAndUser(UUID id, User user);
}