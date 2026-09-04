// src/main/java/com/mymindmirror/backend/payload/response/UserFullProfileResponse.java
package com.mymindmirror.backend.payload.response;
import java.util.UUID;

public record UserFullProfileResponse(
        UUID id,
        String username,
        String email,
        boolean usingOwnKey,
        String maskedKey,
        UserRoadmapPreferencesDto roadmapPreferences,
        String availableHoursJson,
        String timezone,
        String energyPeak,
        String wakeTime,
        String sleepTime,
        String lunchTime,
        String dailyHabitsJson
) {}
