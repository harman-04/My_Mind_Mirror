package com.mymindmirror.backend.service.ai;

import com.google.genai.Client;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.google.genai.common.GoogleGenAiThinkingLevel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class DynamicAiClientService {

    private final ApiKeyService apiKeyService;
    private final UserService userService;

    // Cache key format: "userId_modelName" -> Custom Initialized ChatModel
    private final Map<String, ChatModel> userModelCache = new ConcurrentHashMap<>();

    // Dynamic state tracker for rate-limited models: "modelName" -> Expiration Timestamp
    private final Map<String, Long> modelCooldownMap = new ConcurrentHashMap<>();

    private static final long COOLDOWN_DURATION_MS = TimeUnit.SECONDS.toMillis(60);

    @Value("${spring.ai.google.genai.api-key:}")
    private String globalApiKey;

    @Value("${spring.ai.google.genai.chat.options.temperature:0.4}")
    private Double defaultTemperature;

//    @Retry(name = "geminiRetry", fallbackMethod = "handleGenerateFallback")
//    public String generate(String prompt, UUID userId, AITask task) {
//        String activeModelName = getActiveModelName(task);
//        ChatModel model = getChatModel(userId, activeModelName);
//        return model.call(prompt);
//    }
@Retry(name = "geminiRetry", fallbackMethod = "handleGenerateFallback")
public String generate(String prompt, UUID userId, AITask task) {
    String activeModelName = getActiveModelName(task);
    log.info("Using model: {}", activeModelName);
    ChatModel model = getChatModel(userId, activeModelName);

    try {
        log.info("Calling AI model for Plain Text generation...");
        Prompt p = new Prompt(prompt);
        org.springframework.ai.chat.model.ChatResponse response = model.call(p);

        // Null-check safety
        if (response == null || response.getResults() == null || response.getResults().isEmpty()) {
            log.warn("AI Model returned null for task: {}", task);
            return "I'm currently unable to generate a response. Please try again later.";
        }

        // Log the full response so you can see the thoughts vs the answer
        log.info("FULL RESPONSE GENERATIONS COUNT = {}", response.getResults().size());

        // CRITICAL FIX: Grab the LAST generation in the list.
        // Index 0 is often the "Thoughts". The final index is the actual Answer!
        int lastIndex = response.getResults().size() - 1;
        String finalAnswer = response.getResults().get(lastIndex).getOutput().getText();

        return finalAnswer != null ? finalAnswer.trim() : "";

    } catch (Exception e) {
        log.error("AI generation failed for task {}", task, e);
        throw e; // Let Resilience4j catch it and trigger handleGenerateFallback
    }
}
    public String handleGenerateFallback(String prompt, UUID userId, AITask task, Exception e) {
        // Determine which model actually threw the exception
        String failingModel = isPrimaryCooldownLocked(task.getPrimaryModel()) ? task.getFallbackModel() : task.getPrimaryModel();
        logQuotaExceeded(failingModel);

        log.warn("Model [{}] failed during generation for task {}. Error: {}. Activating alternative routing path...",
                failingModel, task, e.getMessage());

        try {
            // If the primary failed, execute fallback. If fallback failed, look for alternative
            String alternativeModelName = failingModel.equals(task.getPrimaryModel()) ? task.getFallbackModel() : "gemini-2.5-flash";
            ChatModel backupModel = getChatModel(userId, alternativeModelName);
            return backupModel.call(prompt);
        } catch (Exception fallbackException) {
            log.error("CRITICAL: All allocated model endpoints are exhausted for task {}", task, fallbackException);
            return "MyMindMirror is currently handling exceptionally high volume. Please give us a brief moment and try again.";
        }
    }

    @Retry(name = "geminiRetry", fallbackMethod = "handleStructuredFallback")
    public <T> T generateStructured(String prompt, Class<T> responseType, UUID userId, AITask task) {
        String activeModelName = getActiveModelName(task);
        ChatModel model = getChatModel(userId, activeModelName);
        return executeStructuredCall(model, prompt, responseType);
    }

    public <T> T handleStructuredFallback(String prompt, Class<T> responseType, UUID userId, AITask task, Exception e) {
        // Determine which model actually threw the exception
        String failingModel = isPrimaryCooldownLocked(task.getPrimaryModel()) ? task.getFallbackModel() : task.getPrimaryModel();
        logQuotaExceeded(failingModel);

        log.warn("Structured Model [{}] FAILED for task {}. Error: {}. Switching data streams...",
                failingModel, task, e.getMessage());
        try {
            String alternativeModelName = failingModel.equals(task.getPrimaryModel()) ? task.getFallbackModel() : "gemini-2.5-flash";
            ChatModel backupModel = getChatModel(userId, alternativeModelName);
            return executeStructuredCall(backupModel, prompt, responseType);
        } catch (Exception fallbackException) {
            log.error("CRITICAL: Structured data pipelines are entirely rate-limited for task {}", task, fallbackException);
            throw new RuntimeException("All allocated model endpoints are currently rate-limited. Please retry shortly.", fallbackException);
        }
    }

    /**
     * Smart Router: Returns fallback model instantly if primary model is inside its cooldown window.
     */
    private String getActiveModelName(AITask task) {
        String primary = task.getPrimaryModel();
        if (isPrimaryCooldownLocked(primary)) {
            log.info("FAST PATH ACTIVATED: [{}] is cool-down locked. Fast-routing straight to fallback [{}]",
                    primary, task.getFallbackModel());
            return task.getFallbackModel();
        }
        return primary;
    }

    /**
     * Helper to safely evaluate if a model is locked out without modifying map state.
     */
    private boolean isPrimaryCooldownLocked(String modelName) {
        Long blockExpiration = modelCooldownMap.get(modelName);
        if (blockExpiration != null) {
            if (System.currentTimeMillis() < blockExpiration) {
                return true;
            } else {
                modelCooldownMap.remove(modelName);
                log.info("Cooldown window expired for [{}]. Restoring standard path routing.", modelName);
            }
        }
        return false;
    }

    private void logQuotaExceeded(String modelName) {
        log.warn("Circuit Breaker: Locking out model [{}] for 60 seconds due to rate limits.", modelName);
        modelCooldownMap.put(modelName, System.currentTimeMillis() + COOLDOWN_DURATION_MS);
    }

    private <T> T executeStructuredCall(ChatModel model, String prompt, Class<T> responseType) {
        BeanOutputConverter<T> converter = new BeanOutputConverter<>(responseType);

        String structuredPromptText = prompt + "\n\n" +
                "You must respond with a valid JSON object matching this JSON Schema:\n" +
                converter.getJsonSchema() + "\n" +
                "Return ONLY the raw JSON block.";

        GoogleGenAiChatOptions jsonOptions = GoogleGenAiChatOptions.builder()
                .responseMimeType("application/json")
                .build();

        Prompt structuredPrompt = new Prompt(structuredPromptText, jsonOptions);
        org.springframework.ai.chat.model.ChatResponse chatResponse = model.call(structuredPrompt);

        if (chatResponse == null || chatResponse.getResult() == null || chatResponse.getResult().getOutput() == null) {
            throw new RuntimeException("AI Model failed to return a valid response object.");
        }

        String rawResponse = chatResponse.getResult().getOutput().getText();
        String cleanJson = extractJson(rawResponse);
        if (cleanJson == null) {
            throw new RuntimeException("Invalid response layout received from model. Target structural parse failed.");
        }
        return converter.convert(cleanJson);
    }

    private ChatModel getChatModel(UUID userId, String targetModelName) {
        String cacheKey = (userId != null ? userId.toString() : "global") + "_" + targetModelName;

        ChatModel cachedModel = userModelCache.get(cacheKey);
        if (cachedModel != null) {
            return cachedModel;
        }

        String apiKeyToUse = globalApiKey;
        if (userId != null) {
            User user = userService.findById(userId).orElse(null);
            if (user != null) {
                String customKey = apiKeyService.getDecryptedApiKey(user);
                if (customKey != null && !customKey.isBlank()) {
                    apiKeyToUse = customKey;
                }
            }
        }

        final String resolvedApiKey = apiKeyToUse;
        return userModelCache.computeIfAbsent(cacheKey, key -> buildSpecificModel(resolvedApiKey, targetModelName));
    }

    private GoogleGenAiChatModel buildSpecificModel(String apiKey, String modelName) {
        Client googleClient = Client.builder().apiKey(apiKey).build();

//        GoogleGenAiChatOptions.Builder optionsBuilder = GoogleGenAiChatOptions.builder()
//                .model(modelName) // KEEP THIS: Required for parameter validation
//                .temperature(defaultTemperature);
//
////        // CRITICAL FIX FOR GEMMA 4
////        if (modelName.contains("gemma-4")) {
////            // Gemma 4 DOES NOT support thinkingBudget. It requires thinkingLevel.
////            // MINIMAL disables the extended thinking chain (saves tokens & hides thoughts).
////            // HIGH enables deep reasoning.
////            optionsBuilder.thinkingLevel(GoogleGenAiThinkingLevel.MINIMAL);
////
////            // includeThoughts is technically redundant with MINIMAL but safe to keep as defense-in-depth
//////            optionsBuilder.includeThoughts(false);
////        }
//
//        GoogleGenAiChatOptions options = optionsBuilder.build();
//
//        return GoogleGenAiChatModel.builder()
//                .genAiClient(googleClient)
//                .defaultOptions(options)
//                .build();
        GoogleGenAiChatOptions options =
                GoogleGenAiChatOptions.builder()
                        .model(modelName)
                        .temperature(defaultTemperature)
                        .build();

        return GoogleGenAiChatModel.builder()
                .genAiClient(googleClient)
                .defaultOptions(options)
                .build();
    }

    private String extractJson(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) return null;
        String text = rawResponse.trim();
        int firstBrace = text.indexOf('{');
        int firstBracket = text.indexOf('[');
        int start = (firstBrace != -1 && firstBracket != -1) ? Math.min(firstBrace, firstBracket) : Math.max(firstBrace, firstBracket);
        if (start == -1) return null;
        int end = (text.charAt(start) == '{') ? text.lastIndexOf('}') : text.lastIndexOf(']');
        if (end == -1 || end < start) return null;
        return text.substring(start, end + 1);
    }

    public void evictUserModel(UUID userId) {
        userModelCache.keySet().removeIf(key -> key.startsWith(userId.toString()));
    }
}