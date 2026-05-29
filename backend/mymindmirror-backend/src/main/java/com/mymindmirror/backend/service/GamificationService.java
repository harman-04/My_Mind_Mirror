package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserStats;
import com.mymindmirror.backend.payload.response.UserStatsResponse;
import com.mymindmirror.backend.repository.UserStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class GamificationService {

    private final UserStatsRepository userStatsRepository;
    private final ObjectMapper objectMapper;


    @Transactional
    public UserStats initializeStats(User user) {
        UserStats stats = new UserStats();
        stats.setUser(user);
        stats.setCurrentStreak(0);
        stats.setLongestStreak(0);
        stats.setLastActiveDate(null);
        stats.setBadgesJson("[]");
        stats.setTotalTasksCompleted(0);
        return userStatsRepository.save(stats);
    }

    @CacheEvict(value = "gamificationStats", key = "#user.id")
    @Transactional
    public UserStats updateStreakAndBadges(User user, boolean taskCompletedToday) {
        UserStats stats = userStatsRepository.findByUser(user)
                .orElseGet(() -> initializeStats(user));

        LocalDate today = LocalDate.now();
        LocalDate lastActive = stats.getLastActiveDate();

        if (taskCompletedToday) {
            if (lastActive == null) {
                // First activity
                stats.setCurrentStreak(1);
            } else if (lastActive.equals(today)) {
                // Already active today, do nothing
            } else if (lastActive.equals(today.minusDays(1))) {
                // Consecutive day
                stats.setCurrentStreak(stats.getCurrentStreak() + 1);
            } else {
                // Gap – reset streak
                stats.setCurrentStreak(1);
            }

            stats.setLastActiveDate(today);
            stats.setTotalTasksCompleted(stats.getTotalTasksCompleted() + 1);

            // Update longest streak
            if (stats.getCurrentStreak() > stats.getLongestStreak()) {
                stats.setLongestStreak(stats.getCurrentStreak());
            }

            // Award badges
            Set<String> badges = getBadgesSet(stats);
            boolean changed = false;

            // First task badge
            if (stats.getTotalTasksCompleted() == 1 && !badges.contains("FIRST_STEP")) {
                badges.add("FIRST_STEP");
                changed = true;
            }
            // Task master: 10 tasks
            if (stats.getTotalTasksCompleted() >= 10 && !badges.contains("TASK_MASTER")) {
                badges.add("TASK_MASTER");
                changed = true;
            }
            // 3-day streak
            if (stats.getCurrentStreak() >= 3 && !badges.contains("THREE_DAY_STREAK")) {
                badges.add("THREE_DAY_STREAK");
                changed = true;
            }
            // 7-day streak
            if (stats.getCurrentStreak() >= 7 && !badges.contains("SEVEN_DAY_STREAK")) {
                badges.add("SEVEN_DAY_STREAK");
                changed = true;
            }
            // Roadmap finisher – we'll check when a roadmap is completed (separate call)

            if (changed) {
                try {
                    stats.setBadgesJson(objectMapper.writeValueAsString(badges));
                } catch (JsonProcessingException e) {
                    log.error("Failed to serialize badges", e);
                }
            }

            stats = userStatsRepository.save(stats);
        }
        return stats;
    }

    private Set<String> getBadgesSet(UserStats stats) {
        try {
            if (stats.getBadgesJson() != null && !stats.getBadgesJson().isBlank()) {
                return objectMapper.readValue(stats.getBadgesJson(), new TypeReference<Set<String>>() {});
            }
        } catch (Exception e) {
            log.error("Failed to parse badges JSON", e);
        }
        return new HashSet<>();
    }

    @CacheEvict(value = "gamificationStats", key = "#user.id")
    @Transactional
    public void awardRoadmapCompletedBadge(User user) {
        UserStats stats = userStatsRepository.findByUser(user)
                .orElseGet(() -> initializeStats(user));
        Set<String> badges = getBadgesSet(stats);
        if (!badges.contains("ROADMAP_FINISHER")) {
            badges.add("ROADMAP_FINISHER");
            try {
                stats.setBadgesJson(objectMapper.writeValueAsString(badges));
                userStatsRepository.save(stats);
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize badges", e);
            }
        }
    }

    @Cacheable(value = "gamificationStats", key = "#user.id")
    public UserStatsResponse getUserStats(User user) {
        UserStats stats = userStatsRepository.findByUser(user)
                .orElseGet(() -> initializeStats(user));

        Set<String> badges = getBadgesSet(stats);

        return new UserStatsResponse(
                stats.getCurrentStreak(),
                stats.getLongestStreak(),
                stats.getLastActiveDate(),
                badges,
                stats.getTotalTasksCompleted()
        );
    }
}