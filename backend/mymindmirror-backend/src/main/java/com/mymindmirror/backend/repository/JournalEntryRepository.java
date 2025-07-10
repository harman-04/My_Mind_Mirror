package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {

    List<JournalEntry> findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(User user, LocalDate startDate, LocalDate endDate);

    List<JournalEntry> findByUserAndEntryDateBetween(User user, LocalDate startDate, LocalDate endDate);

    Optional<JournalEntry> findByIdAndUser(UUID id, User user);

    /**
     * Custom query to get daily aggregated data for a user within a date range.
     * This will calculate the average mood score and sum of raw text length for each day.
     *
     * @param userId The ID of the user.
     * @param startDate The start date for the aggregation.
     * @param endDate The end date for the aggregation.
     * @return A list of Object arrays, where each array contains [LocalDate, Double (avg_mood), Long (sum_words)].
     * The result is ordered by entry date.
     */
    @Query("SELECT je.entryDate, AVG(je.moodScore), SUM(LENGTH(je.rawText)) " +
            "FROM JournalEntry je " +
            "WHERE je.user.id = :userId AND je.entryDate BETWEEN :startDate AND :endDate " +
            "GROUP BY je.entryDate " +
            "ORDER BY je.entryDate ASC")
    List<Object[]> findDailyAggregatedDataByUserAndDateRange(
            @Param("userId") UUID userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
