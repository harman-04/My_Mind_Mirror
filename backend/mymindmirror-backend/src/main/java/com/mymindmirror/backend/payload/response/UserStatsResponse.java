package com.mymindmirror.backend.payload.response;
import java.time.LocalDate;
import java.util.Set;

public record UserStatsResponse(
        int currentStreak,
        int longestStreak,
        LocalDate lastActiveDate,
        Set<String> badges,
        int totalTasksCompleted,
        int experiencePoints,
        int level,
        int totalJournalEntries,
        int totalChats,
        int schedulesGenerated
) {}