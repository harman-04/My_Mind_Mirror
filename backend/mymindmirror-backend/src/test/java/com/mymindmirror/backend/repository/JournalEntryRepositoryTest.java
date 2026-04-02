package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class JournalEntryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    private User testUser;
    private JournalEntry entry1, entry2;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(testUser);

        entry1 = new JournalEntry();
        entry1.setUser(testUser);
        entry1.setEntryDate(LocalDate.now());
        entry1.setRawText("encrypted_text_1");
        entry1.setMoodScore(0.8);
        entityManager.persist(entry1);

        entry2 = new JournalEntry();
        entry2.setUser(testUser);
        entry2.setEntryDate(LocalDate.now().minusDays(1));
        entry2.setRawText("encrypted_text_2");
        entry2.setMoodScore(-0.2);
        entityManager.persist(entry2);
    }

    @Test
    void findByUserAndEntryDateBetween_ShouldReturnEntriesInDateRange() {
        LocalDate start = LocalDate.now().minusDays(2);
        LocalDate end = LocalDate.now();
        List<JournalEntry> entries = journalEntryRepository
                .findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(testUser, start, end);
        assertThat(entries).hasSize(2);
    }

    @Test
    void findByUserAndMoodScoreBetween_ShouldReturnEntriesWithinScoreRange() {
        List<JournalEntry> entries = journalEntryRepository
                .findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(testUser, 0.0, 1.0);
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getMoodScore()).isEqualTo(0.8);
    }
}