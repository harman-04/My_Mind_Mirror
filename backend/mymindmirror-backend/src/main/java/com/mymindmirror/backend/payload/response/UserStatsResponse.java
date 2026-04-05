package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsResponse {
    private int currentStreak;
    private int longestStreak;
    private LocalDate lastActiveDate;
    private Set<String> badges;
    private int totalTasksCompleted;
}