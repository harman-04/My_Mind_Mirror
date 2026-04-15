package com.mymindmirror.backend.service;

import com.mymindmirror.backend.enums.InsightStatus;
import com.mymindmirror.backend.payload.response.ClusterResult;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class MLServiceClient {

    private final WebClient mlServiceWebClient;

    public MLServiceClient(@Qualifier("mlServiceWebClient") WebClient mlServiceWebClient) {
        this.mlServiceWebClient = mlServiceWebClient;
    }

    @CircuitBreaker(name = "mlServiceCircuitBreaker", fallbackMethod = "fallbackJournalAnalysis")
    public Mono<Map<String, Object>> analyzeJournal(String journalText, String apiKey) {
        return mlServiceWebClient.post()
                .uri("/ml/journal/analyze_journal")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(Map.of("text", journalText))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .flatMap(response -> {
                    Object warning = response.get("warning");
                    Object error = response.get("error");
                    boolean hasError = (warning != null && !"null".equals(warning) && !"".equals(warning)) || error != null;
                    if (hasError) {
                        log.warn("ML service returned warning/error: {}", response);
                        return Mono.error(new RuntimeException("ML service error: " + response));
                    }
                    return Mono.just(response);
                });
    }

    private Mono<Map<String, Object>> fallbackJournalAnalysis(String journalText, String apiKey, Throwable t) {
        log.warn("Fallback for analyzeJournal: {}", t.getMessage());
        return Mono.just(Map.of(
                "moodScore", 0.0,
                "emotions", Map.of(),
                "coreConcerns", List.of(),
                "summary", "AI analysis temporarily unavailable. Please try again later.",
                "growthTips", List.of("Check your network connection.", "Ensure the ML service is running."),
                "keyPhrases", List.of()
        ));
    }

    @CircuitBreaker(name = "mlServiceCircuitBreaker", fallbackMethod = "fallbackAnomalyDetection")
    public Mono<Map<String, Object>> runAnomalyDetection(Object requestBody, String apiKey) {
        return mlServiceWebClient.post()
                .uri("/ml/journal/anomaly_detection")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .flatMap(response -> {
                    Object warning = response.get("warning");
                    Object error = response.get("error");
                    boolean hasError = (warning != null && !"null".equals(warning) && !"".equals(warning)) || error != null;
                    if (hasError) {
                        log.warn("ML service returned warning/error in anomaly detection: {}", response);
                        return Mono.error(new RuntimeException("ML service error: " + response));
                    }
                    return Mono.just(response);
                });
    }

    private Mono<Map<String, Object>> fallbackAnomalyDetection(Object requestBody, String apiKey, Throwable t) {
        log.warn("Fallback for anomaly detection: {}", t.getMessage());
        return Mono.just(Map.of("anomalies", List.of(), "message", "Anomaly detection unavailable."));
    }

    @CircuitBreaker(name = "mlServiceCircuitBreaker", fallbackMethod = "fallbackClustering")
    public Mono<ClusterResult> clusterJournalEntries(Object requestBody, String apiKey) {
        return mlServiceWebClient.post()
                .uri("/ml/journal/cluster_journal_entries")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(ClusterResult.class)
                .flatMap(response -> {
                    if (response.getNumClusters() == 0 && response.getEntryClusters().isEmpty()) {
                        log.warn("Clustering returned empty result (possibly due to error): {}", response);
                        return Mono.error(new RuntimeException("Clustering failed"));
                    }
                    return Mono.just(response);
                });
    }

    private Mono<ClusterResult> fallbackClustering(Object requestBody, String apiKey, Throwable t) {
        log.warn("Fallback for clustering: {}", t.getMessage());
        return Mono.just(new ClusterResult(0, Map.of(), List.of()));
    }

    @CircuitBreaker(name = "mlServiceCircuitBreaker", fallbackMethod = "fallbackReflection")
    public Mono<Map<String, String>> generateReflection(String promptText, String apiKey) {
        return mlServiceWebClient.post()
                .uri("/generate_reflection")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(Map.of("prompt_text", promptText))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, String>>() {})
                .flatMap(response -> {
                    Object error = response.get("error");
                    Object reflection = response.get("reflection");
                    if (error != null || reflection == null) {
                        log.warn("Reflection generation returned error or null reflection: {}", response);
                        return Mono.error(new RuntimeException("Reflection generation failed"));
                    }
                    return Mono.just(response);
                });
    }

    private Mono<Map<String, String>> fallbackReflection(String promptText, String apiKey, Throwable t) {
        log.warn("Fallback for reflection: {}", t.getMessage());
        return Mono.just(Map.of("reflection", "Unable to generate reflection at this time. Please try again later."));
    }

    @CircuitBreaker(name = "mlServiceCircuitBreaker", fallbackMethod = "fallbackMilestoneInsights")
    public Mono<MilestoneInsightResponse> getMilestoneInsights(Object requestPayload, String apiKey) {
        return mlServiceWebClient.post()
                .uri("/ml/milestone/milestone_insights")
                .header("X-Gemini-Key", apiKey != null ? apiKey : "")
                .bodyValue(requestPayload)
                .retrieve()
                .bodyToMono(MilestoneInsightResponse.class)
                .flatMap(response -> {
                    if (response.getStatus() == InsightStatus.ERROR) {
                        log.warn("Milestone insights returned ERROR status: {}", response);
                        return Mono.error(new RuntimeException("Milestone insights failed"));
                    }
                    return Mono.just(response);
                });
    }

    private Mono<MilestoneInsightResponse> fallbackMilestoneInsights(Object requestPayload, String apiKey, Throwable t) {
        log.warn("Fallback for milestone insights: {}", t.getMessage());
        return Mono.just(new MilestoneInsightResponse(
                "Insights currently unavailable.",
                "Cannot assess performance at this moment.",
                List.of("Check network connection to ML service or ML service logs."),
                "Keep up the great work!",
                List.of("Review milestone details."),
                InsightStatus.ERROR
        ));
    }
}