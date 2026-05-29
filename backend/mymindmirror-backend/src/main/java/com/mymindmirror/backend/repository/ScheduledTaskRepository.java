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
    void deleteByUser(User user);
    List<ScheduledTask> findByCustomTaskId(UUID customTaskId);

    @Modifying
    @Query("DELETE FROM ScheduledTask st WHERE st.user = :user AND st.customTaskId IS NOT NULL")
    void deleteByUserAndCustomTaskIdNotNull(@Param("user") User user);
}