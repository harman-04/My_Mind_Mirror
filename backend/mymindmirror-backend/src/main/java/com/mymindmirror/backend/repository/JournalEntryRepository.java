// src/main/java/com/mymindmirror/backend/repository/JournalEntryRepository.java

package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {

    /**
     * Finds journal entries for a specific user within a date range, ordered by creation timestamp descending.
     * @param user The user entity.
     * @param startDate The start date of the range (inclusive).
     * @param endDate The end date of the range (inclusive).
     * @return A list of JournalEntry objects.
     */
    List<JournalEntry> findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(User user, LocalDate startDate, LocalDate endDate);

    /**
     * Finds journal entries for a specific user within a date range.
     * This method is used for charts where ordering by creation timestamp might not be strictly necessary
     * or where further processing (like aggregation) will handle the order.
     * @param user The user entity.
     * @param startDate The start date of the range (inclusive).
     * @param endDate The end date of the range (inclusive).
     * @return A list of JournalEntry objects.
     */
    List<JournalEntry> findByUserAndEntryDateBetween(User user, LocalDate startDate, LocalDate endDate);

    /**
     * Finds all journal entries for a specific user, ordered by creation timestamp descending.
     * @param user The user entity.
     * @return A list of all JournalEntry objects for the user.
     */
    List<JournalEntry> findByUserOrderByCreationTimestampDesc(User user);


    /**
     * Finds all journal entries for a specific user.
     * This is used by the clustering service to fetch all entries without date filtering.
     * @param user The user entity.
     * @return A list of all JournalEntry objects for the user.
     */
    List<JournalEntry> findByUser(User user);


    /**
     * Aggregates daily mood and word count data for a user within a date range.
     * @param userId The ID of the user.
     * @param startDate The start date of the range (inclusive).
     * @param endDate The end date of the range (inclusive).
     * @return A list of Object arrays, each containing (LocalDate date, Double avgMood, Long totalWords).
     */
    @Query("SELECT je.entryDate, AVG(je.moodScore), SUM(LENGTH(je.rawText)) " +
            "FROM JournalEntry je WHERE je.user.id = :userId AND je.entryDate BETWEEN :startDate AND :endDate " +
            "GROUP BY je.entryDate ORDER BY je.entryDate")
    List<Object[]> findDailyAggregatedDataByUserAndDateRange(@Param("userId") UUID userId,
                                                             @Param("startDate") LocalDate startDate,
                                                             @Param("endDate") LocalDate endDate);

    // ⭐ NEW METHOD FOR SEARCH FUNCTIONALITY ⭐
    /**
     * Finds journal entries for a user that contain a specific keyword in their raw text.
     * The search is case-insensitive.
     *
     * IMPORTANT: This query searches the *encrypted* rawText in the database.
     * The decryption logic will be handled in the JournalService after retrieval.
     * For accurate keyword search on encrypted data, you would typically need to
     * decrypt all entries first and then filter in memory, or use a more advanced
     * searchable encryption scheme (which is outside the scope of this project).
     * For now, this will search the *Base64 encoded encrypted string*.
     * If the keyword itself is not present in the Base64 representation, it won't match.
     * This is a limitation of searching on encrypted data without a dedicated search solution.
     *
     * @param user The user entity.
     * @param keyword The keyword to search for (case-insensitive).
     * @return A list of JournalEntry objects matching the criteria.
     */
    @Query("SELECT je FROM JournalEntry je WHERE je.user = :user AND LOWER(je.rawText) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY je.creationTimestamp DESC")
    List<JournalEntry> findByUserAndRawTextContainingKeyword(@Param("user") User user, @Param("keyword") String keyword);

    /**
     * Finds journal entries for a user that have a mood score within a specified range.
     *
     * @param user The user entity.
     * @param minMoodScore The minimum mood score (inclusive).
     * @param maxMoodScore The maximum mood score (inclusive).
     * @return A list of JournalEntry objects matching the criteria.
     */
    List<JournalEntry> findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(User user, Double minMoodScore, Double maxMoodScore);
}
