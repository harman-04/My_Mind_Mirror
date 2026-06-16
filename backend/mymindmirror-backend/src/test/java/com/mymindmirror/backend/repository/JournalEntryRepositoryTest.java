package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class JournalEntryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    private User testUser;
    private JournalEntry entry1, entry2, entry3;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(testUser);

        // --- PERSIST IN CHRONOLOGICAL ORDER (Oldest to Newest) ---
        // This ensures the Newest Entry (Today) has the Newest Timestamp

        // 1. Entry from 10 days ago (Oldest creation time)
        entry3 = new JournalEntry();
        entry3.setUser(testUser);
        entry3.setEntryDate(LocalDate.now().minusDays(10));
        entry3.setRawText("encrypted_text_3");
        entry3.setMoodScore(0.5);
        entityManager.persist(entry3);
        entityManager.flush(); // Force a tiny time gap

        // 2. Yesterday's entry
        entry2 = new JournalEntry();
        entry2.setUser(testUser);
        entry2.setEntryDate(LocalDate.now().minusDays(1));
        entry2.setRawText("encrypted_text_2");
        entry2.setMoodScore(-0.2);
        entityManager.persist(entry2);
        entityManager.flush();

        // 3. Today's entry (Newest creation time)
        entry1 = new JournalEntry();
        entry1.setUser(testUser);
        entry1.setEntryDate(LocalDate.now());
        entry1.setRawText("encrypted_text_1");
        entry1.setMoodScore(0.8);
        entityManager.persist(entry1);

        entityManager.flush();
        entityManager.clear(); // Clear cache to force repository to hit the DB
    }
    @Test
    void findByUserAndEntryDateBetweenOrderByCreationTimestampDesc_ShouldReturnEntriesInDateRange() {
        LocalDate start = LocalDate.now().minusDays(2);
        LocalDate end = LocalDate.now();
        List<JournalEntry> entries = journalEntryRepository
                .findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(testUser, start, end);
        assertThat(entries).hasSize(2);
        // Should be ordered by creation timestamp descending (most recent first)
        assertThat(entries.get(0).getEntryDate()).isEqualTo(LocalDate.now()); // This should pass now
        assertThat(entries.get(1).getEntryDate()).isEqualTo(LocalDate.now().minusDays(1));
    }

    @Test
    void findByUserAndEntryDateBetween_ShouldReturnEntriesWithoutOrdering() {
        LocalDate start = LocalDate.now().minusDays(2);
        LocalDate end = LocalDate.now();
        List<JournalEntry> entries = journalEntryRepository
                .findByUserAndEntryDateBetween(testUser, start, end);
        assertThat(entries).hasSize(2);
        // Order is not guaranteed, but we can check content
        assertThat(entries).extracting(JournalEntry::getEntryDate)
                .containsExactlyInAnyOrder(LocalDate.now(), LocalDate.now().minusDays(1));
    }

    @Test
    void findByUserOrderByCreationTimestampDesc_ShouldReturnAllEntriesSorted() {
        List<JournalEntry> entries = journalEntryRepository.findByUserOrderByCreationTimestampDesc(testUser);
        assertThat(entries).hasSize(3);
        // Most recent first
        assertThat(entries.get(0).getEntryDate()).isEqualTo(LocalDate.now()); // This should pass now
        assertThat(entries.get(1).getEntryDate()).isEqualTo(LocalDate.now().minusDays(1));
        assertThat(entries.get(2).getEntryDate()).isEqualTo(LocalDate.now().minusDays(10));
    }

    @Test
    void findByUser_ShouldReturnAllEntriesForUser() {
        List<JournalEntry> entries = journalEntryRepository.findByUser(testUser);
        assertThat(entries).hasSize(3);
    }

    @Test
    void findDailyAggregatedDataByUserAndDateRange_ShouldReturnAggregatedData() {
        LocalDate start = LocalDate.now().minusDays(2);
        LocalDate end = LocalDate.now();
        List<Object[]> results = journalEntryRepository.findDailyAggregatedDataByUserAndDateRange(
                testUser.getId(), start, end);
        assertThat(results).hasSize(2); // Two days: today and yesterday

        // Find today's aggregation
        Object[] todayResult = results.stream()
                .filter(r -> ((LocalDate) r[0]).equals(LocalDate.now()))
                .findFirst().orElse(null);
        assertThat(todayResult).isNotNull();
        assertThat(todayResult[1]).isEqualTo(0.8); // avg mood
        assertThat((Long) todayResult[2]).isPositive(); // word count

        // Yesterday's aggregation
        Object[] yesterdayResult = results.stream()
                .filter(r -> ((LocalDate) r[0]).equals(LocalDate.now().minusDays(1)))
                .findFirst().orElse(null);
        assertThat(yesterdayResult).isNotNull();
        assertThat(yesterdayResult[1]).isEqualTo(-0.2);
        assertThat((Long) yesterdayResult[2]).isPositive();
    }

    @Test
    void findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc_ShouldReturnFilteredEntries() {
        // Test mood score between -1 and 0
        List<JournalEntry> entries = journalEntryRepository
                .findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(testUser, -1.0, 0.0);
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getMoodScore()).isEqualTo(-0.2);

        // Test mood score between 0 and 1
        entries = journalEntryRepository
                .findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(testUser, 0.0, 1.0);
        assertThat(entries).hasSize(2);
        // Should be ordered by creation timestamp descending (entry1 before entry3)
        assertThat(entries.get(0).getMoodScore()).isEqualTo(0.8); // This should pass now
        assertThat(entries.get(1).getMoodScore()).isEqualTo(0.5);

        assertThat(entries.get(0).getEntryDate()).isEqualTo(LocalDate.now());
        assertThat(entries.get(1).getEntryDate()).isEqualTo(LocalDate.now().minusDays(10));
    }

    @Test
    void findByUserAndEntryDateBetweenOrderByCreationTimestampDesc_WithPagination_ShouldReturnPage() {
        LocalDate start = LocalDate.now().minusDays(10);
        LocalDate end = LocalDate.now();
        Pageable pageable = PageRequest.of(0, 2); // first page, size 2
        Page<JournalEntry> page = journalEntryRepository
                .findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(testUser, start, end, pageable);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).hasSize(2);
        // descending sort
        assertThat(page.getContent().get(0).getEntryDate()).isEqualTo(LocalDate.now()); // This should pass now
        assertThat(page.getContent().get(1).getEntryDate()).isEqualTo(LocalDate.now().minusDays(1));

        // Second page
        pageable = PageRequest.of(1, 2);
        page = journalEntryRepository
                .findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(testUser, start, end, pageable);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getEntryDate()).isEqualTo(LocalDate.now().minusDays(10));
    }

    @Test
    void findByUser_WhenNoEntries_ShouldReturnEmptyList() {
        User anotherUser = new User();
        anotherUser.setUsername("otheruser");
        anotherUser.setEmail("other@example.com");
        anotherUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(anotherUser);

        List<JournalEntry> entries = journalEntryRepository.findByUser(anotherUser);
        assertThat(entries).isEmpty();
    }
}