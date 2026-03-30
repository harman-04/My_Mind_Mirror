// src/main/java/com/mymindmirror.backend/service/MilestoneInsightService.java
package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.User;
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
    private final ApiKeyService apiKeyService;
    private final MLServiceClient mlServiceClient;

    // Remove the @Qualifier entirely as it is not needed for these two services
    public MilestoneInsightService(ApiKeyService apiKeyService, MLServiceClient mlServiceClient) {
        this.apiKeyService = apiKeyService;
        this.mlServiceClient = mlServiceClient;
    } 
    /**
     * Calls the Flask ML service to get AI-driven insights for a given milestone.
     *
     * @param milestone The Milestone entity for which to get insights.
     * @return A Mono containing MilestoneInsightResponse, or a fallback response if an error occurs.
     */


    public Mono<MilestoneInsightResponse> getMilestoneInsights(Milestone milestone) {
        User user = milestone.getUser();
        String apiKey = apiKeyService.getDecryptedApiKey(user);
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

        return mlServiceClient.getMilestoneInsights(requestPayload, apiKey);
    }
}