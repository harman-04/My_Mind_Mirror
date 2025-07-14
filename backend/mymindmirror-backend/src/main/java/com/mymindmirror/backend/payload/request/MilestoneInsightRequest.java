// src/main/java/com/mymindmirror.backend/payload/request/MilestoneInsightRequest.java
        package com.mymindmirror.backend.payload.request;

import com.mymindmirror.backend.model.Milestone;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO for sending milestone data to the Flask ML service for insights.
 * Mirrors the structure expected by the /milestone_insights endpoint in app.py.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneInsightRequest {
    private String title;
    private String description;
    private LocalDate dueDate;
    private Milestone.Status status;
    private double completionPercentage;
    private List<TaskForInsightRequest> tasks; // List of nested task DTOs
}