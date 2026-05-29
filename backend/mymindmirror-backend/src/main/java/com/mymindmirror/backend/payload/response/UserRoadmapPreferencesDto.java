// src/main/java/com/mymindmirror/backend/payload/response/UserRoadmapPreferencesDto.java
package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRoadmapPreferencesDto {
    private String difficulty;
    private String languagePreference;
    private String learningStyle;
    private Integer hoursPerWeek;
    private boolean avoidWeekends;
}