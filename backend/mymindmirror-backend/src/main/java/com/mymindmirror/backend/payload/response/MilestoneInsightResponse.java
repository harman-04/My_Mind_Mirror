// src/main/java/com/mymindmirror.backend/payload/response/MilestoneInsightResponse.java
package com.mymindmirror.backend.payload.response;

import com.mymindmirror.backend.enums.InsightStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for receiving AI-generated milestone insights from the Flask ML service.
 * Mirrors the structure returned by the /milestone_insights endpoint in app.py.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneInsightResponse {
    private String remainingWork;
    private String performanceAssessment;
    private List<String> tips;
    private String encouragement;
    private List<String> suggestedNewTasks;
    private InsightStatus status; // To indicate if the insight generation was successful or an error



    // Constructor for error cases or simplified responses
    public MilestoneInsightResponse(String performanceAssessment, InsightStatus status, List<String> tips, String encouragement, List<String> suggestedNewTasks) {
        this.remainingWork = "N/A"; // Default for error cases
        this.performanceAssessment = performanceAssessment;
        this.tips = tips;
        this.encouragement = encouragement;
        this.suggestedNewTasks = suggestedNewTasks;
        this.status = status;
    }
}