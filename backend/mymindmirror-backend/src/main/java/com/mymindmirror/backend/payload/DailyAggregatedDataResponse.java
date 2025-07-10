package com.mymindmirror.backend.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyAggregatedDataResponse {
    private LocalDate date;
    private Double averageMood;
    private Long totalWords;
    // You could add more aggregated fields here if needed, e.g., dominant emotion for the day
}
