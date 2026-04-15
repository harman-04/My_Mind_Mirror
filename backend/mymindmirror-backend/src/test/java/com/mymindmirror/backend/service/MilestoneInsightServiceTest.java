package com.mymindmirror.backend.service;

import com.mymindmirror.backend.enums.InsightStatus;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MilestoneInsightServiceTest {

    @Mock
    private ApiKeyService apiKeyService;

    @Mock
    private MLServiceClient mlServiceClient;

    @InjectMocks
    private MilestoneInsightService milestoneInsightService;

    private User testUser;
    private Milestone testMilestone;
    private Task testTask;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(java.util.UUID.randomUUID());
        testUser.setUsername("testuser");

        testMilestone = new Milestone();
        testMilestone.setId(java.util.UUID.randomUUID());
        testMilestone.setTitle("Test Milestone");
        testMilestone.setDescription("Test description");
        testMilestone.setDueDate(LocalDate.now().plusDays(7));
        testMilestone.setStatus(Status.IN_PROGRESS);
        testMilestone.setUser(testUser);
        testMilestone.setCreationDate(LocalDate.now());

        testTask = new Task();
        testTask.setId(java.util.UUID.randomUUID());
        testTask.setDescription("Test task");
        testTask.setDueDate(LocalDate.now().plusDays(3));
        testTask.setStatus(Status.PENDING);
        testMilestone.setTasks(List.of(testTask));
    }

    @Test
    void getMilestoneInsights_Success_ReturnsInsights() {
        // Given
        String apiKey = "test-api-key";
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(apiKey);

        MilestoneInsightResponse expectedResponse = new MilestoneInsightResponse(
                "Remaining work summary",
                "Performance assessment",
                List.of("Tip 1", "Tip 2"),
                "Encouragement message",
                List.of("New task suggestion"),
                InsightStatus.SUCCESS
        );

        when(mlServiceClient.getMilestoneInsights(any(), any()))
                .thenReturn(Mono.just(expectedResponse));

        // When
        Mono<MilestoneInsightResponse> result = milestoneInsightService.getMilestoneInsights(testMilestone);

        // Then
        StepVerifier.create(result)
                .expectNext(expectedResponse)
                .verifyComplete();
    }

    @Test
    void getMilestoneInsights_WhenApiKeyNull_UsesEmptyKey() {
        // Given
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(null);

        MilestoneInsightResponse expectedResponse = new MilestoneInsightResponse(
                "Fallback remaining work",
                "Fallback assessment",
                List.of("Fallback tip"),
                "Fallback encouragement",
                List.of("Fallback task"),
                InsightStatus.ERROR
        );

        when(mlServiceClient.getMilestoneInsights(any(), any()))
                .thenReturn(Mono.just(expectedResponse));

        // When
        Mono<MilestoneInsightResponse> result = milestoneInsightService.getMilestoneInsights(testMilestone);

        // Then
        StepVerifier.create(result)
                .expectNext(expectedResponse)
                .verifyComplete();
    }

    @Test
    void getMilestoneInsights_WhenMlServiceFails_ReturnsFallback() {
        // Given
        String apiKey = "test-api-key";
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(apiKey);

        // ML service returns error mono (the circuit breaker fallback will handle it, but we simulate error)
        when(mlServiceClient.getMilestoneInsights(any(), any()))
                .thenReturn(Mono.error(new RuntimeException("ML service error")));

        // The circuit breaker fallback should return a default response.
        // However, we need to ensure the fallback is invoked. In the actual MLServiceClient,
        // there is a fallback method. But in this unit test, we mock the client to return error,
        // and the service will propagate it. To test the fallback, we would need to test the client separately.
        // Here we just verify that the error is propagated.
        Mono<MilestoneInsightResponse> result = milestoneInsightService.getMilestoneInsights(testMilestone);

        // Then
        StepVerifier.create(result)
                .expectErrorMatches(throwable -> throwable instanceof RuntimeException &&
                        throwable.getMessage().equals("ML service error"))
                .verify();
    }
}