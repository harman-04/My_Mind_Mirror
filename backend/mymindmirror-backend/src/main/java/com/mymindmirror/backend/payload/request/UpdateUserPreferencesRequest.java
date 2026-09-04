package com.mymindmirror.backend.payload.request;

import jakarta.validation.constraints.Pattern;
import java.time.LocalTime;

public record UpdateUserPreferencesRequest(
        String availableHoursJson,

        String timezone,

        @Pattern(regexp = "MORNING|AFTERNOON|EVENING", message = "Energy peak must be MORNING, AFTERNOON, or EVENING")
        String energyPeak,

        LocalTime wakeTime,

        LocalTime sleepTime,

        LocalTime lunchTime,

        String dailyHabitsJson
) {}