package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserStats;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class UserStatsRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserStatsRepository userStatsRepository;

    private User testUser;
    private UserStats testStats;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("statsuser");
        testUser.setEmail("stats@example.com");
        testUser.setPasswordHash("encoded");
        entityManager.persistAndFlush(testUser);

        testStats = new UserStats();
        testStats.setUser(testUser);
        testStats.setCurrentStreak(3);
        testStats.setLongestStreak(5);
        testStats.setLastActiveDate(LocalDate.now());
        testStats.setBadgesJson("[\"FIRST_STEP\",\"THREE_DAY_STREAK\"]");
        testStats.setTotalTasksCompleted(8);
        entityManager.persistAndFlush(testStats);
    }

    @Test
    void findByUser_ShouldReturnStats_WhenExists() {
        Optional<UserStats> found = userStatsRepository.findByUser(testUser);
        assertThat(found).isPresent();
        assertThat(found.get().getCurrentStreak()).isEqualTo(3);
        assertThat(found.get().getLongestStreak()).isEqualTo(5);
        assertThat(found.get().getBadgesJson()).contains("FIRST_STEP");
    }

    @Test
    void findByUser_ShouldReturnEmpty_WhenNoStats() {
        User anotherUser = new User();
        anotherUser.setUsername("another");
        anotherUser.setEmail("another@example.com");
        anotherUser.setPasswordHash("encoded");
        entityManager.persistAndFlush(anotherUser);

        Optional<UserStats> found = userStatsRepository.findByUser(anotherUser);
        assertThat(found).isEmpty();
    }

    @Test
    void save_ShouldPersistStats() {
        User newUser = new User();
        newUser.setUsername("newuser");
        newUser.setEmail("new@example.com");
        newUser.setPasswordHash("encoded");
        entityManager.persistAndFlush(newUser);

        UserStats newStats = new UserStats();
        newStats.setUser(newUser);
        newStats.setCurrentStreak(1);
        newStats.setLongestStreak(1);
        newStats.setLastActiveDate(LocalDate.now());
        newStats.setBadgesJson("[]");
        newStats.setTotalTasksCompleted(0);

        UserStats saved = userStatsRepository.save(newStats);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUser().getId()).isEqualTo(newUser.getId());
    }

    @Test
    void update_ShouldModifyStats() {
        testStats.setCurrentStreak(10);
        testStats.setLongestStreak(10);
        testStats.setTotalTasksCompleted(15);
        UserStats updated = userStatsRepository.save(testStats);

        assertThat(updated.getCurrentStreak()).isEqualTo(10);
        assertThat(updated.getLongestStreak()).isEqualTo(10);
        assertThat(updated.getTotalTasksCompleted()).isEqualTo(15);
    }

    @Test
    void delete_ShouldRemoveStats() {
        userStatsRepository.delete(testStats);
        Optional<UserStats> deleted = userStatsRepository.findByUser(testUser);
        assertThat(deleted).isEmpty();
    }
}