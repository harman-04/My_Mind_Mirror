package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserStats;
import com.mymindmirror.backend.payload.response.UserStatsResponse;
import com.mymindmirror.backend.repository.UserStatsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GamificationServiceTest {

    @Mock
    private UserStatsRepository userStatsRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private GamificationService gamificationService;

    private User testUser;
    private UserStats testStats;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");

        testStats = new UserStats();
        testStats.setUser(testUser);
        testStats.setCurrentStreak(0);
        testStats.setLongestStreak(0);
        testStats.setLastActiveDate(null);
        testStats.setBadgesJson("[]");
        testStats.setTotalTasksCompleted(0);
    }

    @Test
    void initializeStats_ShouldCreateNewStats() {
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);

        UserStats result = gamificationService.initializeStats(testUser);

        assertThat(result).isNotNull();
        assertThat(result.getCurrentStreak()).isZero();
        assertThat(result.getBadgesJson()).isEqualTo("[]");
        verify(userStatsRepository).save(any(UserStats.class));
    }

    @Test
    void updateStreakAndBadges_FirstTask_ShouldSetStreakTo1() throws JsonProcessingException {
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        // Mock readValue to return empty set when parsing "[]"
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        assertThat(result.getCurrentStreak()).isEqualTo(1);
        assertThat(result.getLastActiveDate()).isEqualTo(LocalDate.now());
        assertThat(result.getTotalTasksCompleted()).isEqualTo(1);
        verify(userStatsRepository).save(any(UserStats.class));
    }

    @Test
    void updateStreakAndBadges_ConsecutiveDay_ShouldIncrementStreak() throws JsonProcessingException {
        testStats.setCurrentStreak(1);
        testStats.setLastActiveDate(LocalDate.now().minusDays(1));
        testStats.setTotalTasksCompleted(1);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        assertThat(result.getCurrentStreak()).isEqualTo(2);
        assertThat(result.getLongestStreak()).isEqualTo(2);
        assertThat(result.getTotalTasksCompleted()).isEqualTo(2);
    }

    @Test
    void updateStreakAndBadges_GapDay_ShouldResetStreak() throws JsonProcessingException {
        testStats.setCurrentStreak(3);
        testStats.setLongestStreak(3);  // Set previous longest streak
        testStats.setLastActiveDate(LocalDate.now().minusDays(2));
        testStats.setTotalTasksCompleted(3);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        assertThat(result.getCurrentStreak()).isEqualTo(1);  // Reset to 1
        assertThat(result.getLongestStreak()).isEqualTo(3);  // Longest remains 3
    }

    @Test
    void updateStreakAndBadges_SameDay_ShouldNotChangeStreak() throws JsonProcessingException {
        testStats.setCurrentStreak(5);
        testStats.setLastActiveDate(LocalDate.now());
        testStats.setTotalTasksCompleted(5);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        assertThat(result.getCurrentStreak()).isEqualTo(5);
        assertThat(result.getTotalTasksCompleted()).isEqualTo(6);
    }

    @Test
    void updateStreakAndBadges_FirstTask_ShouldAwardFirstStepBadge() throws JsonProcessingException {
        testStats.setTotalTasksCompleted(0);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());
        when(objectMapper.writeValueAsString(anySet())).thenReturn("[\"FIRST_STEP\"]");

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        ArgumentCaptor<UserStats> captor = ArgumentCaptor.forClass(UserStats.class);
        verify(userStatsRepository, atLeastOnce()).save(captor.capture());
        UserStats savedStats = captor.getValue();
        assertThat(savedStats.getBadgesJson()).contains("FIRST_STEP");
    }

    @Test
    void updateStreakAndBadges_TenTasks_ShouldAwardTaskMasterBadge() throws JsonProcessingException {
        testStats.setTotalTasksCompleted(9);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());
        when(objectMapper.writeValueAsString(anySet())).thenReturn("[\"TASK_MASTER\"]");

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        ArgumentCaptor<UserStats> captor = ArgumentCaptor.forClass(UserStats.class);
        verify(userStatsRepository, atLeastOnce()).save(captor.capture());
        UserStats savedStats = captor.getValue();
        assertThat(savedStats.getBadgesJson()).contains("TASK_MASTER");
    }

    @Test
    void updateStreakAndBadges_ThreeDayStreak_ShouldAwardThreeDayBadge() throws JsonProcessingException {
        testStats.setCurrentStreak(2);
        testStats.setLastActiveDate(LocalDate.now().minusDays(1));
        testStats.setTotalTasksCompleted(2);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());
        when(objectMapper.writeValueAsString(anySet())).thenReturn("[\"THREE_DAY_STREAK\"]");

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        ArgumentCaptor<UserStats> captor = ArgumentCaptor.forClass(UserStats.class);
        verify(userStatsRepository, atLeastOnce()).save(captor.capture());
        UserStats savedStats = captor.getValue();
        assertThat(savedStats.getBadgesJson()).contains("THREE_DAY_STREAK");
    }

    @Test
    void updateStreakAndBadges_SevenDayStreak_ShouldAwardSevenDayBadge() throws JsonProcessingException {
        testStats.setCurrentStreak(6);
        testStats.setLastActiveDate(LocalDate.now().minusDays(1));
        testStats.setTotalTasksCompleted(6);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());
        when(objectMapper.writeValueAsString(anySet())).thenReturn("[\"SEVEN_DAY_STREAK\"]");

        UserStats result = gamificationService.updateStreakAndBadges(testUser, true);

        ArgumentCaptor<UserStats> captor = ArgumentCaptor.forClass(UserStats.class);
        verify(userStatsRepository, atLeastOnce()).save(captor.capture());
        UserStats savedStats = captor.getValue();
        assertThat(savedStats.getBadgesJson()).contains("SEVEN_DAY_STREAK");
    }

    @Test
    void awardRoadmapCompletedBadge_ShouldAwardIfNotAlready() throws JsonProcessingException {
        testStats.setBadgesJson("[]");
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        when(userStatsRepository.save(any(UserStats.class))).thenReturn(testStats);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(new HashSet<>());
        when(objectMapper.writeValueAsString(anySet())).thenReturn("[\"ROADMAP_FINISHER\"]");

        gamificationService.awardRoadmapCompletedBadge(testUser);

        ArgumentCaptor<UserStats> captor = ArgumentCaptor.forClass(UserStats.class);
        verify(userStatsRepository).save(captor.capture());
        UserStats savedStats = captor.getValue();
        assertThat(savedStats.getBadgesJson()).contains("ROADMAP_FINISHER");
    }

    @Test
    void awardRoadmapCompletedBadge_ShouldNotAwardIfAlreadyHas() throws JsonProcessingException {
        testStats.setBadgesJson("[\"ROADMAP_FINISHER\"]");
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        Set<String> existing = new HashSet<>();
        existing.add("ROADMAP_FINISHER");
        when(objectMapper.readValue(eq(testStats.getBadgesJson()), any(TypeReference.class))).thenReturn(existing);

        gamificationService.awardRoadmapCompletedBadge(testUser);

        verify(userStatsRepository, never()).save(any());
    }

    @Test
    void getUserStats_ShouldReturnDto() throws JsonProcessingException {
        testStats.setCurrentStreak(3);
        testStats.setLongestStreak(5);
        testStats.setLastActiveDate(LocalDate.now());
        testStats.setBadgesJson("[\"FIRST_STEP\",\"THREE_DAY_STREAK\"]");
        testStats.setTotalTasksCompleted(12);
        when(userStatsRepository.findByUser(testUser)).thenReturn(Optional.of(testStats));
        Set<String> expectedBadges = Set.of("FIRST_STEP", "THREE_DAY_STREAK");
        when(objectMapper.readValue(eq(testStats.getBadgesJson()), any(TypeReference.class)))
                .thenReturn(expectedBadges);

        UserStatsResponse response = gamificationService.getUserStats(testUser);

        assertThat(response.getCurrentStreak()).isEqualTo(3);
        assertThat(response.getLongestStreak()).isEqualTo(5);
        assertThat(response.getLastActiveDate()).isEqualTo(LocalDate.now());
        assertThat(response.getBadges()).containsExactlyInAnyOrder("FIRST_STEP", "THREE_DAY_STREAK");
        assertThat(response.getTotalTasksCompleted()).isEqualTo(12);
    }
}