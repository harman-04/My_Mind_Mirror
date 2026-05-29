// src/main/java/com/mymindmirror/backend/repository/JournalEntryRepository.java

package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {


    @EntityGraph(attributePaths = "keyPhrases")
    List<JournalEntry> findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(User user, LocalDate startDate, LocalDate endDate);


    @EntityGraph(attributePaths = "keyPhrases")
    List<JournalEntry> findByUserAndEntryDateBetween(User user, LocalDate startDate, LocalDate endDate);


    @EntityGraph(attributePaths = "keyPhrases")
    List<JournalEntry> findByUserOrderByCreationTimestampDesc(User user);





    @EntityGraph(attributePaths = {"keyPhrases", "user"})
    List<JournalEntry> findByUser(User user);



//    @Query("SELECT je FROM JournalEntry je " +
//            "JOIN FETCH je.keyPhrases " +
//            "JOIN FETCH je.user " +
//            "WHERE je.id = :id")
//    Optional<JournalEntry> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT je FROM JournalEntry je " +
            "LEFT JOIN FETCH je.keyPhrases " +
            "LEFT JOIN FETCH je.user " +
            "WHERE je.id = :id")
    Optional<JournalEntry> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT je.entryDate, AVG(je.moodScore), SUM(LENGTH(je.rawText)) " +
            "FROM JournalEntry je WHERE je.user.id = :userId AND je.entryDate BETWEEN :startDate AND :endDate " +
            "GROUP BY je.entryDate ORDER BY je.entryDate")
    List<Object[]> findDailyAggregatedDataByUserAndDateRange(@Param("userId") UUID userId,
                                                             @Param("startDate") LocalDate startDate,
                                                             @Param("endDate") LocalDate endDate);




    List<JournalEntry> findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(User user, Double minMoodScore, Double maxMoodScore);

    @Modifying
    @Query("DELETE FROM KeyPhrase k WHERE k.journalEntry.id = :entryId")
    void deleteKeyPhrasesByEntryId(@Param("entryId") UUID entryId);

//    @EntityGraph(attributePaths = "keyPhrases")
    Page<JournalEntry> findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(User user, LocalDate startDate, LocalDate endDate, Pageable pageable);

}
