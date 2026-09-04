// src/main/java/com/mymindmirror/backend/payload/response/UserRoadmapPreferencesDto.java
package com.mymindmirror.backend.payload.response;

public record UserRoadmapPreferencesDto(
        String difficulty,
        String languagePreference,
        String learningStyle,
        Integer hoursPerWeek,
        boolean avoidWeekends
) {}