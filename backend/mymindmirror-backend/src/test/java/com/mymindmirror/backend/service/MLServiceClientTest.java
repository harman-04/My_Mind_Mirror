package com.mymindmirror.backend.service;

import com.mymindmirror.backend.enums.InsightStatus;
import com.mymindmirror.backend.payload.response.ClusterResult;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MLServiceClientTest {

    private MockWebServer mockWebServer;
    private MLServiceClient mlServiceClient;

    @BeforeEach
    void setUp() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();
        WebClient webClient = WebClient.builder()
                .baseUrl(mockWebServer.url("/").toString())
                .build();
        mlServiceClient = new MLServiceClient(webClient);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockWebServer.shutdown();
    }

    @Test
    void analyzeJournal_shouldReturnResponseOnSuccess() {
        String responseJson = """
                {
                    "moodScore": 0.75,
                    "emotions": {"joy": 0.8, "sadness": 0.2},
                    "coreConcerns": ["work"],
                    "summary": "Feeling productive",
                    "growthTips": ["Take breaks"],
                    "keyPhrases": ["focus"]
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, Object>> result = mlServiceClient.analyzeJournal("I feel great", "test-api-key");

        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.get("moodScore")).isEqualTo(0.75);
                    assertThat(response.get("summary")).isEqualTo("Feeling productive");
                })
                .verifyComplete();
    }

    @Test
    void analyzeJournal_shouldTreatWarningAsError() {
        String responseJson = """
                {
                    "warning": "AI quota exceeded",
                    "moodScore": 0.0
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, Object>> result = mlServiceClient.analyzeJournal("test", "key");

        StepVerifier.create(result)
                .expectErrorMatches(throwable -> throwable instanceof RuntimeException &&
                        throwable.getMessage().contains("ML service error"))
                .verify();
    }

    @Test
    void runAnomalyDetection_shouldReturnResponseOnSuccess() {
        String responseJson = """
                {
                    "anomalies": [{"date": "2024-01-01", "type": ["mood"], "message": "Mood drop"}],
                    "message": "Anomalies detected"
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, Object>> result = mlServiceClient.runAnomalyDetection(List.of(), "key");

        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.get("message")).isEqualTo("Anomalies detected");
                })
                .verifyComplete();
    }

    @Test
    void clusterJournalEntries_shouldReturnResponseOnSuccess() {
        String responseJson = """
                {
                    "numClusters": 2,
                    "clusterThemes": {"Theme 1": "work", "Theme 2": "health"},
                    "entryClusters": [0, 1, 0]
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<ClusterResult> result = mlServiceClient.clusterJournalEntries(Map.of(), "key");

        StepVerifier.create(result)
                .assertNext(clusterResult -> {
                    assertThat(clusterResult.getNumClusters()).isEqualTo(2);
                    assertThat(clusterResult.getClusterThemes()).containsEntry("Theme 1", "work");
                    assertThat(clusterResult.getEntryClusters()).containsExactly(0, 1, 0);
                })
                .verifyComplete();
    }

    @Test
    void clusterJournalEntries_shouldTreatEmptyResultAsError() {
        String responseJson = """
                {
                    "numClusters": 0,
                    "clusterThemes": {},
                    "entryClusters": []
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<ClusterResult> result = mlServiceClient.clusterJournalEntries(Map.of(), "key");

        StepVerifier.create(result)
                .expectErrorMatches(throwable -> throwable instanceof RuntimeException &&
                        throwable.getMessage().contains("Clustering failed"))
                .verify();
    }

    @Test
    void generateReflection_shouldReturnResponseOnSuccess() {
        String responseJson = """
                {
                    "reflection": "Keep going, you're doing great!"
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, String>> result = mlServiceClient.generateReflection("prompt", "key");

        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.get("reflection")).isEqualTo("Keep going, you're doing great!");
                })
                .verifyComplete();
    }

    @Test
    void generateReflection_shouldTreatErrorResponseAsError() {
        String responseJson = """
                {
                    "error": "Something went wrong"
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, String>> result = mlServiceClient.generateReflection("prompt", "key");

        StepVerifier.create(result)
                .expectErrorMatches(throwable -> throwable instanceof RuntimeException &&
                        throwable.getMessage().contains("Reflection generation failed"))
                .verify();
    }

    @Test
    void getMilestoneInsights_shouldReturnResponseOnSuccess() {
        String responseJson = """
                {
                    "remainingWork": "1 task left",
                    "performanceAssessment": "On track",
                    "tips": ["Focus on time management"],
                    "encouragement": "You can do it!",
                    "suggestedNewTasks": ["Review progress"],
                    "status": "SUCCESS"
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<MilestoneInsightResponse> result = mlServiceClient.getMilestoneInsights(Map.of(), "key");

        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.getRemainingWork()).isEqualTo("1 task left");
                    assertThat(response.getStatus()).isEqualTo(InsightStatus.SUCCESS);
                })
                .verifyComplete();
    }

    @Test
    void getMilestoneInsights_shouldTreatErrorStatusAsError() {
        String responseJson = """
                {
                    "remainingWork": "",
                    "performanceAssessment": "",
                    "tips": [],
                    "encouragement": "",
                    "suggestedNewTasks": [],
                    "status": "ERROR"
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<MilestoneInsightResponse> result = mlServiceClient.getMilestoneInsights(Map.of(), "key");

        StepVerifier.create(result)
                .expectErrorMatches(throwable -> throwable instanceof RuntimeException &&
                        throwable.getMessage().contains("Milestone insights failed"))
                .verify();
    }

    // Edge cases for warning/error detection
    @Test
    void analyzeJournal_withWarningEmptyString_shouldNotTreatAsError() {
        String responseJson = """
                {
                    "warning": "",
                    "moodScore": 0.5
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, Object>> result = mlServiceClient.analyzeJournal("test", "key");

        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.get("moodScore")).isEqualTo(0.5);
                })
                .verifyComplete();
    }

    @Test
    void analyzeJournal_withWarningStringNull_shouldNotTreatAsError() {
        String responseJson = """
                {
                    "warning": "null",
                    "moodScore": 0.3
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, Object>> result = mlServiceClient.analyzeJournal("test", "key");

        StepVerifier.create(result)
                .assertNext(response -> {
                    assertThat(response.get("moodScore")).isEqualTo(0.3);
                })
                .verifyComplete();
    }

    @Test
    void generateReflection_withNullReflection_shouldTreatAsError() {
        String responseJson = """
                {
                    "reflection": null
                }
                """;
        mockWebServer.enqueue(new MockResponse().setBody(responseJson).addHeader("Content-Type", "application/json"));

        Mono<Map<String, String>> result = mlServiceClient.generateReflection("prompt", "key");

        StepVerifier.create(result)
                .expectErrorMatches(throwable -> throwable instanceof RuntimeException &&
                        throwable.getMessage().contains("Reflection generation failed"))
                .verify();
    }
}