package com.mymindmirror.backend.payload.response;

import com.mymindmirror.backend.enums.InsightStatus;
import java.util.List;

/**
 * DTO for receiving AI-generated milestone insights natively from Spring AI.
 */
public record MilestoneInsightResponse(
        String remainingWork,
        String performanceAssessment,
        List<String> tips,
        String encouragement,
        List<String> suggestedNewTasks,
        InsightStatus status // Native Jackson mapping will convert the string "SUCCESS" to this Enum
) {
    // Static factory method for fallback errors
    public static MilestoneInsightResponse createFallback() {
        return new MilestoneInsightResponse(
                "Unable to determine remaining work.",
                "AI analysis unavailable.",
                List.of("Check your Gemini API key and quota.", "Ensure your network is stable."),
                "Manual review is recommended. You can still track your progress manually.",
                List.of("Review incomplete tasks", "Set a new deadline if needed"),
                InsightStatus.ERROR
        );
    }
}