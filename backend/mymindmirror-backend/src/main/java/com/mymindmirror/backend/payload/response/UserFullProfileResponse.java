// src/main/java/com/mymindmirror/backend/payload/response/UserFullProfileResponse.java
package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserFullProfileResponse {
    private UUID id;
    private String username;
    private String email;

    // API key status
    private boolean usingOwnKey;
    private String maskedKey;

    // Roadmap preferences
    private UserRoadmapPreferencesDto roadmapPreferences;

    // User scheduling preferences
    private String availableHoursJson;
    private String timezone;

    // --- NEW: Lifestyle fields for Smart AI Timetable ---
    private String energyPeak;
    private String wakeTime;
    private String sleepTime;
    private String lunchTime;
    private String dailyHabitsJson;
}