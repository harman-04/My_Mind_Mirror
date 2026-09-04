
// MoodDataResponse.java (for chart data)
package com.mymindmirror.backend.payload.response;
import java.time.LocalDate;

public record MoodDataResponse(LocalDate date, Double moodScore) {}