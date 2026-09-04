// src/main/java/com/mymindmirror/backend/payload/response/UserPreferencesResponse.java
package com.mymindmirror.backend.payload.response;

public record UserPreferencesResponse(
        String availableHoursJson,
        String timezone,
        String energyPeak,
        String wakeTime,
        String sleepTime,
        String lunchTime,
        String dailyHabitsJson
) {}