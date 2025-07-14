// src/main/java/com/mymindmirror.backend/service/MilestoneInsightService.java
package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.payload.request.MilestoneInsightRequest;
import com.mymindmirror.backend.payload.request.TaskForInsightRequest;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service to interact with the Flask ML service for Milestone insights.
 */
@Service
public class MilestoneInsightService {

    private static final Logger logger = LoggerFactory.getLogger(MilestoneInsightService.class);

    // Inject the WebClient configured for the ML service
    private final WebClient mlServiceWebClient;

    public MilestoneInsightService(@Qualifier("mlServiceWebClient") WebClient mlServiceWebClient) {
        this.mlServiceWebClient = mlServiceWebClient;
    }

    /**
     * Calls the Flask ML service to get AI-driven insights for a given milestone.
     *
     * @param milestone The Milestone entity for which to get insights.
     * @return A Mono containing MilestoneInsightResponse, or a fallback response if an error occurs.
     */
    public Mono<MilestoneInsightResponse> getMilestoneInsights(Milestone milestone) {
        logger.info("MilestoneInsightService: Requesting AI insights for milestone: {}", milestone.getTitle());

        // Map Milestone tasks to TaskForInsightRequest DTOs
        List<TaskForInsightRequest> taskRequests = milestone.getTasks().stream()
                .map(task -> new TaskForInsightRequest(
                        task.getDescription(),
                        task.getDueDate(),
                        task.getStatus()
                ))
                .collect(Collectors.toList());

        // Create the request payload for the Flask ML service
        MilestoneInsightRequest requestPayload = new MilestoneInsightRequest(
                milestone.getTitle(),
                milestone.getDescription(),
                milestone.getDueDate(),
                milestone.getStatus(),
                milestone.getCompletionPercentage(),
                taskRequests
        );

        return mlServiceWebClient.post()
                .uri("/milestone_insights") // Endpoint in Flask app.py
                .bodyValue(requestPayload)
                .retrieve()
                .bodyToMono(MilestoneInsightResponse.class)
                .doOnSuccess(response -> logger.info("MilestoneInsightService: Successfully received AI insights from ML service for milestone: {}", milestone.getTitle()))
                .doOnError(e -> logger.error("MilestoneInsightService: Error calling Flask ML service for milestone insights: {}", e.getMessage(), e))
                .onErrorResume(e -> {
                    logger.error("MilestoneInsightService: Fallback for getMilestoneInsights due to error: {}", e.getMessage());
                    // Return a default/empty response on error to prevent breaking the frontend
                    return Mono.just(new MilestoneInsightResponse(
                            "Insights currently unavailable.",
                            "Cannot assess performance at this moment.",
                            List.of("Check network connection to ML service or ML service logs."),
                            "Keep up the great work!",
                            List.of("Review milestone details."),
                            MilestoneInsightResponse.InsightStatus.ERROR // ⭐ Ensure this is here in your actual code ⭐
                    ));
                });
    }
}