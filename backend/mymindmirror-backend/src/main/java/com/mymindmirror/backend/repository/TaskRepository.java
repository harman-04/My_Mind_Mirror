// src/main/java/com/mymindmirror/backend/repository/TaskRepository.java
package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for Task entities.
 * Provides methods for CRUD operations and fetching tasks by milestone.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    /**
     * Finds all tasks belonging to a specific milestone, ordered by creation timestamp ascending.
     * @param milestone The milestone whose tasks to retrieve.
     * @return A list of tasks.
     */
    List<Task> findByMilestoneOrderByCreationTimestampAsc(Milestone milestone);

    /**
     * Finds a task by its ID and the owning milestone.
     * This ensures that a task can only be accessed if it belongs to the specified milestone.
     * @param id The ID of the task.
     * @param milestone The owning milestone.
     * @return A list containing the task if found and belonging to the milestone.
     */
    List<Task> findByIdAndMilestone(UUID id, Milestone milestone);
}
