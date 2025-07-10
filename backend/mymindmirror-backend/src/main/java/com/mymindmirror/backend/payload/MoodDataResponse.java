
// MoodDataResponse.java (for chart data)
package com.mymindmirror.backend.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDate;

/**
 * DTO for mood data specifically for charting.
 */
@Data
@AllArgsConstructor // Lombok generates a constructor with all fields
public class MoodDataResponse {
    private LocalDate date;
    private Double moodScore;
}
