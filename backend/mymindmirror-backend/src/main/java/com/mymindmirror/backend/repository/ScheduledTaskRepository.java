package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.ScheduledTask;
import com.mymindmirror.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledTaskRepository extends JpaRepository<ScheduledTask, UUID> {
    List<ScheduledTask> findByUserAndScheduledDateBetween(User user, LocalDate start, LocalDate end);
    List<ScheduledTask> findByUserAndCompletedFalseAndScheduledDateLessThanEqual(User user, LocalDate date);

    // The old Brute Force method (keep it, as we use it when the user deletes their whole account)
    void deleteByUser(User user);

    List<ScheduledTask> findByCustomTaskId(UUID customTaskId);

    @Modifying
    @Query("DELETE FROM ScheduledTask st WHERE st.user = :user AND st.customTaskId IS NOT NULL")
    void deleteByUserAndCustomTaskIdNotNull(@Param("user") User user);

    // --- 💡 NEW: The "Surgical Strike" Deletes ---

    @Modifying
    @Query("DELETE FROM ScheduledTask st WHERE st.user = :user AND st.completed = false")
    void deleteIncompleteByUser(@Param("user") User user);

    @Modifying
    @Query("DELETE FROM ScheduledTask st WHERE st.user = :user AND st.completed = false AND (st.customTaskId IS NOT NULL OR st.blockType != 'WORK_TASK')")
    void deleteIncompleteCustomAndRoutinesByUser(@Param("user") User user);

    // --- 💡 NEW: Re-optimise Today Delete ---
    @Modifying
    @Query("DELETE FROM ScheduledTask st WHERE st.user = :user AND st.completed = false AND st.scheduledDate = :today")
    void deleteIncompleteTodayByUser(@Param("user") User user, @Param("today") LocalDate today);


    /**
     * Find all scheduled tasks for a given user.
     * Used for efficient retrieval of already‑scheduled task IDs.
     */
    List<ScheduledTask> findByUser(User user);
}