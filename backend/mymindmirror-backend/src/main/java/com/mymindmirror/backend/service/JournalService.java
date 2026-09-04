package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.KeyPhrase;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.*;
import com.mymindmirror.backend.repository.DailyJournalSummaryRepository;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.service.ai.DynamicAiClientService;
import com.mymindmirror.backend.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.hibernate.Hibernate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronization;
/**
 * Service class for managing JournalEntry-related business logic.
 * Handles saving, retrieving, updating, deleting, and orchestrating AI analysis for journal entries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JournalService {

    private final JournalEntryRepository journalEntryRepository;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final ApiKeyService apiKeyService;
//    private final MLServiceClient mlServiceClient;
    private final Map<String, CachedQuestion> questionCache = new ConcurrentHashMap<>();
    private final AsyncJournalAnalysisService asyncJournalAnalysisService;
    private final DailyJournalSummaryRepository dailyJournalSummaryRepository;
    private final DynamicAiClientService aiClientService;
    private final AnomalyDetectionService anomalyDetectionService;
    private final EmbeddingGenerationService embeddingGenerationService;
    private final ChatMemoryService chatMemoryService;
    private final GamificationService gamificationService;

    @Value("${app.ml-service.url}")
    private String mlServiceBaseUrl;

    private static class CachedQuestion {
        final String question;
        final long timestamp;
        CachedQuestion(String question) {
            this.question = question;
            this.timestamp = System.currentTimeMillis();
        }
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > TimeUnit.MINUTES.toMillis(5);
        }
    }

    /**
     * Saves a new journal entry. Always triggers AI analysis for new entries.
     * @param user The authenticated user creating the entry.
     * @param rawText The raw journal text provided by the user.
     * @return The saved JournalEntry entity with AI analysis results.
     */

    /**
     * Saves a new journal entry and schedules AI analysis post-commit.
     */
    @Transactional
    @CacheEvict(value = "keyPhraseFrequencies", key = "#user.id")
    public JournalEntry saveJournalEntry(User user, String rawText) {
        log.info("Saving new journal entry for user: {}", user.getUsername());

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            throw new IllegalStateException("User secret (password hash) not available for encryption.");
        }

        JournalEntry newEntry = new JournalEntry();
        newEntry.setUser(user);
        newEntry.setEntryDate(LocalDate.now());
        newEntry.setCreationTimestamp(LocalDateTime.now());

        String actualRawText = (rawText != null) ? rawText : "";

        int wordCount = actualRawText.trim().isEmpty() ? 0 : actualRawText.split("\\s+").length;
        newEntry.setWordCount(wordCount);

        String encryptedText = EncryptionUtil.encrypt(actualRawText, userSecret);
        newEntry.setRawText(encryptedText != null ? encryptedText : actualRawText);

        // Reset AI fields to ensure a clean state
        resetAiFields(newEntry);

        // Save the entry to get the UUID
        JournalEntry savedEntry = journalEntryRepository.save(newEntry);
        questionCache.remove(user.getId().toString());

        // 💡 NEW: Reward the user for Journaling!
        gamificationService.recordActivity(user, "JOURNAL");

        // Ensure the async task only starts after the DB transaction has committed
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    log.debug("Transaction committed for entry {}. Triggering async analysis.", savedEntry.getId());
                    asyncJournalAnalysisService.analyzeJournalEntryAsync(savedEntry.getId(), actualRawText, user.getId());
                }
            });
        } else {
            // Fallback for non-transactional contexts
            asyncJournalAnalysisService.analyzeJournalEntryAsync(savedEntry.getId(), actualRawText, user.getId());
        }

        log.info("Journal entry {} saved, async analysis scheduled for post-commit", savedEntry.getId());
        return savedEntry;
    }

    /**
     * Updates an existing journal entry and re-runs AI analysis if text changed.
     */
    @Transactional
    @CacheEvict(value = "keyPhraseFrequencies", key = "#user.id")
    public JournalEntry updateJournalEntry(UUID entryId, User user, String updatedText) {
        log.info("Attempting to update journal entry with ID: {} for user: {}", entryId, user.getUsername());

        JournalEntry existingEntry = journalEntryRepository.findByIdWithDetails(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Journal entry not found with ID: " + entryId));

        if (!existingEntry.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You are not authorized to update this journal entry.");
        }

        String userSecret = user.getPasswordHash();
        String textToEncrypt = (updatedText != null) ? updatedText : "";

        String decryptedOldText = EncryptionUtil.decrypt(existingEntry.getRawText(), userSecret);
        boolean textContentChanged = !textToEncrypt.equals(decryptedOldText);

// Recalculate word count if text changed
        int wordCount = textToEncrypt.trim().isEmpty() ? 0 : textToEncrypt.trim().split("\\s+").length;
        existingEntry.setWordCount(wordCount);
        // Apply encryption
        String encryptedText = EncryptionUtil.encrypt(textToEncrypt, userSecret);
        existingEntry.setRawText(encryptedText != null ? encryptedText : textToEncrypt);

        if (textContentChanged) {
            log.info("Journal entry text changed for ID {}. Scheduling new analysis.", entryId);

            // 1. Clear old analysis while we wait for new results
            resetAiFields(existingEntry);

            // 2. Capture the current text for the async thread
            final String textToAnalyze = textToEncrypt;

            // 3. Register post-commit analysis
            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        asyncJournalAnalysisService.analyzeJournalEntryAsync(entryId, textToAnalyze, user.getId());
                    }
                });
            } else {
                asyncJournalAnalysisService.analyzeJournalEntryAsync(entryId, textToAnalyze, user.getId());
            }
        }

        JournalEntry savedEntry = journalEntryRepository.save(existingEntry);
        questionCache.remove(user.getId().toString());
        return savedEntry;
    }
    /**
     * Deletes a journal entry.
     * @param entryId The ID of the entry to delete.
     * @param user The authenticated user (for ownership check).
     * @throws IllegalArgumentException if entry not found or not owned by user.
     */

    @Transactional
    @CacheEvict(value = "keyPhraseFrequencies", key = "#user.id")
    public void deleteJournalEntry(UUID entryId, User user) {
        log.info("Attempting to delete journal entry with ID: {} for user: {}", entryId, user.getUsername());
        JournalEntry existingEntry = journalEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Journal entry not found with ID: " + entryId));

        if (!existingEntry.getUser().getId().equals(user.getId())) {
            log.warn("User {} attempted to delete entry {} not owned by them.", user.getUsername(), entryId);
            throw new IllegalArgumentException("You are not authorized to delete this journal entry.");
        }

        journalEntryRepository.delete(existingEntry);
        embeddingGenerationService.deleteEmbedding(entryId);
        questionCache.remove(user.getId().toString());
        log.info("Journal entry with ID {} for user {} deleted successfully.", entryId, user.getUsername());
    }

    /**
     * Helper method to call ML service for general journal analysis and update JournalEntry fields.
     */
//    private void processAiAnalysis(String textForAnalysis, JournalEntry entryToUpdate, User user) {
//        String apiKey = apiKeyService.getDecryptedApiKey(user);
//        Map<String, Object> mlResponse = null;
//        try {
//            log.info("Calling ML service for journal analysis via circuit breaker");
//            mlResponse = mlServiceClient.analyzeJournal(textForAnalysis, apiKey).block();
//            log.info("ML service for journal analysis responded successfully.");
//        } catch (Exception e) {
//            log.error("Failed to call ML service for journal analysis or received error: {}", e.getMessage(), e);
//        }
//
//        if (mlResponse != null) {
//            try {
//                Object moodScoreObj = mlResponse.get("moodScore");
//                if (moodScoreObj instanceof Number) {
//                    entryToUpdate.setMoodScore(((Number) moodScoreObj).doubleValue());
//                } else {
//                    entryToUpdate.setMoodScore(null);
//                    log.warn("MoodScore from ML service was not a Number. Value: {}", moodScoreObj);
//                }
//
//                entryToUpdate.setEmotions(mlResponse.get("emotions") != null ? objectMapper.writeValueAsString(mlResponse.get("emotions")) : null);
//                entryToUpdate.setCoreConcerns(mlResponse.get("coreConcerns") != null ? objectMapper.writeValueAsString(mlResponse.get("coreConcerns")) : null);
//                entryToUpdate.setSummary((String) mlResponse.get("summary"));
//                entryToUpdate.setGrowthTips(mlResponse.get("growthTips") != null ? objectMapper.writeValueAsString(mlResponse.get("growthTips")) : null);
//
//                List<String> keyPhrasesFromMl = (List<String>) mlResponse.getOrDefault("keyPhrases", Collections.emptyList());
//                List<KeyPhrase> keyPhraseEntities = keyPhrasesFromMl.stream()
//                        .map(phrase -> new KeyPhrase(phrase, entryToUpdate))
//                        .collect(Collectors.toList());
//
//                entryToUpdate.setKeyPhrases(keyPhraseEntities);
//
//                log.info("Journal entry AI analysis results processed.");
//            } catch (JsonProcessingException e) {
//                log.error("Error serializing ML response to JSON string for DB storage: {}", e.getMessage(), e);
//                resetAiFields(entryToUpdate);
//            } catch (ClassCastException e) {
//                log.error("Type casting error from ML response: {}. This might indicate unexpected data types from Flask.", e.getMessage(), e);
//                resetAiFields(entryToUpdate);
//            }
//        } else {
//            log.warn("ML service response was null. Journal entry saved/updated without AI analysis.");
//            resetAiFields(entryToUpdate);
//        }
//    }

    /**
     * Helper method to reset AI fields if analysis fails.
     */
    private void resetAiFields(JournalEntry entry) {
        entry.setMoodScore(null);
        entry.setEmotions(null);
        entry.setCoreConcerns(null);
        entry.setSummary(null);
        entry.setGrowthTips(null);
        // Clear existing keyPhrases instead of creating a new list
        if (entry.getKeyPhrases() != null) {
            entry.getKeyPhrases().clear();
        } else {
            entry.setKeyPhrases(new ArrayList<>());
        }
        entry.setClusterId(null);
    }
    /**
     * Fetches journal entries for a user within a date range, ordered by creation timestamp.
     * Decrypts rawText after fetching.
     */

    @Transactional(readOnly = true)
    public List<JournalEntry> getJournalEntriesForUser(User user, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching journal entries for user: {} from {} to {}", user.getUsername(), startDate, endDate);
        List<JournalEntry> entries = journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(user, startDate, endDate);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
//            if (entry.getKeyPhrases() != null) {
//                Hibernate.initialize(entry.getKeyPhrases());
//            }
//            // ✅ Load user association
//            Hibernate.initialize(entry.getUser());
        }
        return entries;
    }

    /**
     * Decrypts rawText after fetching.
     */

    @Transactional(readOnly = true)
    public Optional<JournalEntry> getJournalEntryById(UUID entryId) {
        log.info("Fetching journal entry by ID: {}", entryId);
        Optional<JournalEntry> entryOptional = journalEntryRepository.findByIdWithDetails(entryId);
        entryOptional.ifPresent(entry -> {
            User user = entry.getUser(); // already loaded
            String userSecret = user.getPasswordHash();
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            } else {
                log.error("User {} has no password hash. Cannot decrypt journal entry with ID {}.", user.getUsername(), entryId);
            }
            // No need to initialize keyPhrases – already loaded by JOIN FETCH
        });
        return entryOptional;
    }
    public List<MoodDataResponse> getMoodDataForChart(User user, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching mood data for chart for user: {} from {} to {}", user.getUsername(), startDate, endDate);
        List<JournalEntry> entries = journalEntryRepository.findByUserAndEntryDateBetween(user, startDate, endDate);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries for mood chart.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
        }
        return entries.stream()
                .filter(entry -> entry.getMoodScore() != null)
                .map(entry -> new MoodDataResponse(entry.getEntryDate(), entry.getMoodScore()))
                .sorted((d1, d2) -> d1.getDate().compareTo(d2.getDate()))
                .collect(Collectors.toList());
    }

    /**
     * Fetches daily aggregated mood and word count data for anomaly detection.
     * @param user The authenticated user.
     * @param startDate The start date for aggregation.
     * @param endDate The end date for aggregation.
     * @return List of DailyAggregatedDataResponse.
     */
//    public List<DailyAggregatedDataResponse> getDailyAggregatedDataForUser(User user, LocalDate startDate, LocalDate endDate) {
//        log.info("Fetching daily aggregated data for user: {} from {} to {}", user.getUsername(), startDate, endDate);
//        List<Object[]> results = journalEntryRepository.findDailyAggregatedDataByUserAndDateRange(user.getId(), startDate, endDate);
//
//        return results.stream()
//                .map(row -> {
//                    LocalDate date = (LocalDate) row[0];
//                    Double avgMood = row[1] != null ? ((Number) row[1]).doubleValue() : null;
//                    Long totalWords = row[2] != null ? ((Number) row[2]).longValue() : null;
//                    return new DailyAggregatedDataResponse(date, avgMood, totalWords);
//                })
//                .collect(Collectors.toList());
//    }

    // Replace the existing method
    @Transactional(readOnly = true)
    public List<DailyAggregatedDataResponse> getDailyAggregatedDataForUser(User user, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching daily aggregated data for user: {} from {} to {}", user.getUsername(), startDate, endDate);

        // Use the summary table
        List<Object[]> results = dailyJournalSummaryRepository.findByUserAndDateRange(user.getId(), startDate, endDate);

        return results.stream()
                .map(row -> new DailyAggregatedDataResponse((LocalDate) row[0], (Double) row[1], (Long) row[2]))
                .collect(Collectors.toList());
    }

    /**
     * Method to call Flask ML service for anomaly detection.
     * @param aggregatedData A list of DailyAggregatedDataResponse objects to send to Flask.
     * @return A Map containing anomaly detection results from Flask.
     */
//    public Map<String, Object> runAnomalyDetection(List<DailyAggregatedDataResponse> aggregatedData) {
//        try {
//            log.info("Calling ML service for anomaly detection via circuit breaker");
//            List<Map<String, Object>> requestBody = aggregatedData.stream()
//                    .map(data -> {
//                        Map<String, Object> map = new HashMap<>();
//                        map.put("date", data.getDate().toString());
//                        map.put("averageMood", data.getAverageMood());
//                        map.put("totalWords", data.getTotalWords());
//                        return map;
//                    })
//                    .collect(Collectors.toList());
//            Map<String, Object> mlResponse = mlServiceClient.runAnomalyDetection(requestBody, null).block();
//            log.info("ML service for anomaly detection responded successfully.");
//            return mlResponse;
//        } catch (Exception e) {
//            log.error("Failed to call ML service for anomaly detection or received error: {}", e.getMessage(), e);
//            return Map.of("error", "Failed to run anomaly detection: " + e.getMessage());
//        }
//    }

    public Map<String, Object> runAnomalyDetection(List<DailyAggregatedDataResponse> aggregatedData) {
        try {
            log.info("Running anomaly detection using EWMA (pure Java)");
            return anomalyDetectionService.detectAnomalies(aggregatedData);
        } catch (Exception e) {
            log.error("Error during anomaly detection: {}", e.getMessage(), e);
            return Map.of("error", "Failed to run anomaly detection: " + e.getMessage());
        }
    }
    /**
     * Triggers the journal entry clustering process in the Flask ML service.
     * This method collects all journal entries for a user and sends them to Flask for clustering.
     * After clustering, it updates the journal entries in the database with their assigned cluster IDs.
     *
     * @param user The user whose journal entries are to be clustered.
     * @param journalTexts The list of raw journal texts to cluster.
     * @param nClusters The desired number of clusters.
     * @return A ClusterResult object containing cluster themes and entry-to-cluster mappings.
     */
//    public ClusterResult triggerJournalClustering(User user, List<String> journalTexts, Integer nClusters) {
//        log.info("Triggering journal clustering for user: {} with {} clusters and {} texts.", user.getUsername(), nClusters, journalTexts.size());
//
//        log.info("NClusters received in JournalService.triggerJournalClustering: {}", nClusters);
//
//        List<JournalEntry> allUserEntries = journalEntryRepository.findByUser(user);
//        allUserEntries.sort(Comparator.comparing(JournalEntry::getCreationTimestamp));
//
//        if (allUserEntries.isEmpty()) {
//            log.warn("No journal entries found for user {}. Cannot perform clustering.", user.getUsername());
//            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
//        }
//
//        if (journalTexts.size() != allUserEntries.size()) {
//            log.error("Mismatch in journalTexts size ({}) and allUserEntries size ({}). Cannot reliably assign cluster IDs.", journalTexts.size(), allUserEntries.size());
//        }
//
//        String apiKey = apiKeyService.getDecryptedApiKey(user);
//        Map<String, Object> requestBody = new HashMap<>();
//        requestBody.put("userId", user.getId().toString());
//        requestBody.put("journalTexts", journalTexts);
//        requestBody.put("nClusters", nClusters);
//
//        ClusterResult clusterResult = null;
//        try {
//            log.info("Sending ML service clustering request");
//            clusterResult = mlServiceClient.clusterJournalEntries(requestBody, apiKey).block();
//            log.info("ML service for journal clustering responded successfully.");
//
//            if (clusterResult != null && clusterResult.getEntryClusters() != null && !clusterResult.getEntryClusters().isEmpty()) {
//                if (clusterResult.getEntryClusters().size() == allUserEntries.size()) {
//                    for (int i = 0; i < allUserEntries.size(); i++) {
//                        JournalEntry entry = allUserEntries.get(i);
//                        entry.setClusterId(clusterResult.getEntryClusters().get(i));
//                        journalEntryRepository.save(entry);
//                    }
//                    log.info("Updated {} journal entries with cluster IDs.", allUserEntries.size());
//                } else {
//                    log.error("Mismatch between number of entries ({}) and cluster IDs received ({}). Cannot reliably assign cluster IDs.", allUserEntries.size(), clusterResult.getEntryClusters().size());
//                }
//            } else {
//                log.warn("Clustering result from ML service was empty or malformed.");
//            }
//        }  catch (Exception e) {
//            log.error("Error during ML service call for clustering: {}", e.getMessage(), e);
//            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
//        }
//        // If clusterResult is null (e.g., Mono.empty().block()), return fallback
//        if (clusterResult == null) {
//            log.warn("ML service returned null cluster result. Returning empty result.");
//            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
//        }
//        return clusterResult;
//    }

    /**
     * Fetches all journal entries for a user (used by clustering).
     * Decrypts rawText after fetching.
     */
    @Transactional(readOnly = true)
    public List<JournalEntry> findByUser(User user) {
        List<JournalEntry> entries = journalEntryRepository.findByUser(user);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries for findByUser.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
            Hibernate.initialize(entry.getUser());

        }
        return entries;
    }

//    @Transactional(readOnly = true)
//    public List<JournalEntry> searchJournalEntriesByKeyword(User user, String keyword) {
//        log.info("Searching journal entries for user: {} with keyword: '{}'", user.getUsername(), keyword);
//
//        String userSecret = user.getPasswordHash();
//        if (userSecret == null || userSecret.isEmpty()) {
//            log.error("User {} has no password hash. Cannot decrypt journal entries for keyword search.", user.getUsername());
//            // Depending on desired behavior, could throw an exception or return empty list
//            return List.of(); // Return empty list if decryption is not possible
//        }
//
//        // 1. Fetch all encrypted entries for the user
//        List<JournalEntry> allEncryptedEntries = journalEntryRepository.findByUserOrderByCreationTimestampDesc(user);
//        log.info("Fetched {} encrypted entries for user {}.", allEncryptedEntries.size(), user.getUsername());
//
//        // 2. Decrypt each entry and then filter by keyword in memory
//        String lowerCaseKeyword = keyword.toLowerCase();
//        List<JournalEntry> matchingEntries = allEncryptedEntries.stream()
//                .peek(entry -> {
//                    // Decrypt the rawText (this part is crucial for search)
//                    String decryptedText = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
//                    entry.setRawText(decryptedText != null ? decryptedText : ""); // Set decrypted text, handle null if decryption fails
//                    Hibernate.initialize(entry.getUser());
//                    if (entry.getKeyPhrases() != null) {
//                        Hibernate.initialize(entry.getKeyPhrases()); // Ensure key phrases are loaded
//                    }
//                })
//                .filter(entry -> entry.getRawText().toLowerCase().contains(lowerCaseKeyword)) // Filter on the decrypted text
//                .collect(Collectors.toList());
//
//
//        log.info("Found {} journal entries matching keyword '{}' after decryption for user {}.", matchingEntries.size(), keyword, user.getUsername());
//        return matchingEntries;
//    }
    @Transactional(readOnly = true)
    public List<JournalEntry> searchJournalEntriesByKeyword(User user, String keyword) {
        log.info("Searching journal entries for user: {} with keyword: '{}'", user.getUsername(), keyword);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries for keyword search.", user.getUsername());
            return List.of();
        }

        // 1. Fetch all encrypted entries. (Repository @EntityGraph handles KeyPhrases and User automatically in 1 query!)
        List<JournalEntry> allEncryptedEntries = journalEntryRepository.findByUserOrderByCreationTimestampDesc(user);
        log.info("Fetched {} encrypted entries for user {}.", allEncryptedEntries.size(), user.getUsername());

        // 2. Decrypt each entry and filter by keyword in memory
        String lowerCaseKeyword = keyword.toLowerCase();
        return allEncryptedEntries.stream()
                .peek(entry -> {
                    String decryptedText = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
                    entry.setRawText(decryptedText != null ? decryptedText : "");
                    // REMOVED Hibernate.initialize() loops - saving immense compute time!
                })
                .filter(entry -> entry.getRawText().toLowerCase().contains(lowerCaseKeyword))
                .collect(Collectors.toList());
    }

//    @Transactional(readOnly = true)
//    public List<JournalEntry> searchJournalEntriesByMoodScore(User user, Double minMood, Double maxMood) {
//        log.info("Searching journal entries for user: {} with mood score between {} and {}", user.getUsername(), minMood, maxMood);
//        List<JournalEntry> entries = journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(user, minMood, maxMood);
//
//        String userSecret = user.getPasswordHash();
//        if (userSecret == null || userSecret.isEmpty()) {
//            log.error("User {} has no password hash. Cannot decrypt journal entries for mood search.", user.getUsername());
//        }
//
//        for (JournalEntry entry : entries) {
//            if (userSecret != null && !userSecret.isEmpty()) {
//                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
//            }
//            if (entry.getKeyPhrases() != null) {
//                Hibernate.initialize(entry.getKeyPhrases());
//            }
//            // ✅ Load user association
//            Hibernate.initialize(entry.getUser());
//        }
//        return entries;
//    }

    @Transactional(readOnly = true)
    public List<JournalEntry> searchJournalEntriesByMoodScore(User user, Double minMood, Double maxMood) {
        log.info("Searching journal entries for user: {} with mood score between {} and {}", user.getUsername(), minMood, maxMood);

        // Repository @EntityGraph handles KeyPhrases and User automatically in 1 query!
        List<JournalEntry> entries = journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(user, minMood, maxMood);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries for mood search.", user.getUsername());
        }


        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            // REMOVED Hibernate.initialize() loops - making this incredibly fast!
        }
        return entries;
    }
    /**
     * Public method for Semantic/Concept Search exposed to the Frontend UI.
     * Converts a natural language concept into a RAG vector search, then decrypts the MySQL results.
     */
    @Transactional(readOnly = true)
    public List<JournalEntry> searchJournalEntriesSemantically(User user, String concept) {
        log.info("Executing semantic concept search for user: {} -> '{}'", user.getUsername(), concept);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            return List.of();
        }

        try {
            org.springframework.ai.vectorstore.SearchRequest searchRequest = org.springframework.ai.vectorstore.SearchRequest.builder()
                    .query(concept)
                    .topK(10)
                    .similarityThreshold(0.55) // Strict threshold for the UI
                    .filterExpression("userId == '" + user.getId().toString() + "'")
                    .build();

            List<Document> documents = embeddingGenerationService.getVectorStore().similaritySearch(searchRequest);

            if (documents == null || documents.isEmpty()) {
                return List.of();
            }

            // 1. Get UUIDs in EXACT order of AI relevance
            List<UUID> orderedEntryIds = documents.stream()
                    .map(doc -> UUID.fromString(doc.getMetadata().get("entryId").toString()))
                    .collect(Collectors.toList());

            // 2. Fetch all from MySQL in 1 query (Unordered)
            List<JournalEntry> unorderedEntries = journalEntryRepository.findByIdIn(orderedEntryIds);

            // 3. Map for fast lookup
            Map<UUID, JournalEntry> entryMap = unorderedEntries.stream()
                    .collect(Collectors.toMap(JournalEntry::getId, java.util.function.Function.identity()));

            // 4. Rebuild the list in the correct Relevance Order and Decrypt
            List<JournalEntry> rankedAndDecryptedEntries = new java.util.ArrayList<>();
            for (UUID id : orderedEntryIds) {
                JournalEntry entry = entryMap.get(id);
                if (entry != null) {
                    String decryptedText = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
                    entry.setRawText(decryptedText != null ? decryptedText : "");
                    rankedAndDecryptedEntries.add(entry);
                }
            }

            return rankedAndDecryptedEntries;

        } catch (Exception e) {
            log.error("Fatal exception during semantic search execution", e);
            return List.of();
        }
    }




    @Transactional(readOnly = true)
    public String generateDailyReflection(User user) {
        log.info("Securely building prompt and generating native Spring AI reflection for user: {}", user.getUsername());

        // 1. Fetch Today's Entries using your DRY helper method! (Handles Decryption automatically)
        LocalDate today = LocalDate.now();
        List<JournalEntry> todayEntries = getJournalEntriesForUser(user, today, today);

        if (todayEntries == null || todayEntries.isEmpty()) {
            return "Journal an entry today to get your daily reflection!";
        }

        // 2. Aggregate Data
        StringBuilder combinedText = new StringBuilder();
        Map<String, Double> aggregatedEmotions = new HashMap<>();
        Set<String> aggregatedConcerns = new HashSet<>();
        int count = todayEntries.size();

        for (JournalEntry entry : todayEntries) {
            // Because getJournalEntriesForUser already decrypted it, we just use getRawText() safely!
            combinedText.append(entry.getRawText()).append("\n\n---\n\n");

            // Parse and sum emotions safely
            try {
                if (entry.getEmotions() != null) {
                    Map<String, Double> emotions = objectMapper.readValue(entry.getEmotions(), new TypeReference<Map<String, Double>>() {});
                    for (Map.Entry<String, Double> e : emotions.entrySet()) {
                        aggregatedEmotions.put(e.getKey(), aggregatedEmotions.getOrDefault(e.getKey(), 0.0) + e.getValue());
                    }
                }
            } catch (Exception ignored) {}

            // Parse and collect concerns safely
            try {
                if (entry.getCoreConcerns() != null) {
                    List<String> concerns = objectMapper.readValue(entry.getCoreConcerns(), new TypeReference<List<String>>() {});
                    aggregatedConcerns.addAll(concerns);
                }
            } catch (Exception ignored) {}
        }

        // Average out the emotions
        List<String> emotionStrings = new ArrayList<>();
        for (Map.Entry<String, Double> entry : aggregatedEmotions.entrySet()) {
            double avg = entry.getValue() / count;
            if (avg > 0.01) {
                emotionStrings.add(String.format("%s (%.1f%%)", entry.getKey(), avg * 100));
            }
        }

        String emotionsStr = emotionStrings.isEmpty() ? "No specific emotions detected." : String.join(", ", emotionStrings);
        String concernsStr = aggregatedConcerns.isEmpty() ? "No specific concerns identified." : String.join(", ", aggregatedConcerns);

        // 3. Build the secure prompt inside the server
        // 3. Build the secure prompt inside the server
        String prompt =   String.format("""
            Based on the following journal entries from today, their detected emotions, and core concerns,
            generate a concise (2-5 sentences), empathetic, and insightful "Today's Reflection" or a short, encouraging thought.

            **Language & Style Instruction:**
            - Detect the language(s) and style (casual, formal, emotional) of the journal entries.
            - Generate the reflection in the **same language(s) and style** as the entries. If the entries mix languages (e.g., Hinglish), respond in that same mix.
            - Focus on summarizing the overall emotional state and offering a gentle, positive perspective.

            **CRITICAL SYSTEM INSTRUCTION:**
            - DO NOT output your internal thought process, drafts, or constraints.
            - DO NOT use "Input:", "Goal:", or "Draft" labels.
            - Return ONLY the final 2-5 sentence reflection, with no introductory or concluding remarks.

            Journal Entries (combined): "%s"
            Detected Emotions (averaged): %s
            Core Concerns: %s

            Today's Reflection:""", combinedText.toString(), emotionsStr, concernsStr);

        // 4. Call our BYOK Spring AI Client safely
        try {
            String reflection = aiClientService.generate(prompt, user.getId(), AITask.TODAY_REFLECTION);
            return (reflection != null && !reflection.isBlank()) ? reflection.trim() : "Couldn't generate a reflection today. Please try again later.";
        } catch (Exception e) {
            log.error("Failed to generate reflection natively: {}", e.getMessage(), e);
            return "Failed to generate reflection due to an internal error.";
        }
    }

    @Transactional(readOnly = true)
    public List<JournalEntry> getAllEntriesForUser(User user) {
        return findByUser(user);
    }

    // In JournalService.java

    @Transactional(readOnly = true)
    public PageResponse<JournalEntryResponse> getJournalEntriesPageResponse(User user, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        log.info("Fetching paginated journal entries for user: {} from {} to {}", user.getUsername(), startDate, endDate);
        Page<JournalEntry> page = journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(
                user, startDate, endDate, pageable);

        String userSecret = user.getPasswordHash();
        List<JournalEntryResponse> responseList = new ArrayList<>();

        for (JournalEntry entry : page.getContent()) {
            // Decrypt raw text
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            // Force initialization of lazy collections while session is open
            Hibernate.initialize(entry.getKeyPhrases());
            Hibernate.initialize(entry.getUser());
            responseList.add(new JournalEntryResponse(entry));
        }

        return new PageResponse<>(
                responseList,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }


   /* @Transactional(readOnly = true)
    public String generateReflectionChat(User user, String query) {
        // 1. Retrieve relevant past entries using RAG
        List<JournalEntry> relevantEntries = retrieveRelevantEntries(user, query, 5);

        StringBuilder context = new StringBuilder();

        if (relevantEntries.isEmpty()) {
            log.info("RAG search yielded no results, falling back to recent entries.");
            context.append("Here are the user's most recent journal entries (no specific match found for the query):\n\n");
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(30);
            List<JournalEntry> recentEntries = getJournalEntriesForUser(user, startDate, endDate);
            for (JournalEntry entry : recentEntries.stream().limit(5).collect(Collectors.toList())) {
                context.append("Date: ").append(entry.getEntryDate()).append("\n");
                context.append("Summary: ").append(entry.getSummary()).append("\n");
                String emotionsStr = entry.getEmotions() != null ? entry.getEmotions() : "{}";
                context.append("Emotions: ").append(emotionsStr).append("\n---\n");
            }
        } else {
            log.info("RAG search successful. Feeding {} relevant entries to LLM.", relevantEntries.size());
            context.append("Here are the user's most relevant past journal entries based on their question:\n\n");
            for (JournalEntry entry : relevantEntries) {
                context.append("Date: ").append(entry.getEntryDate()).append("\n");
                context.append("Summary: ").append(entry.getSummary()).append("\n");
                String emotionsStr = entry.getEmotions() != null ? entry.getEmotions() : "{}";
                context.append("Emotions: ").append(emotionsStr).append("\n");
                if (entry.getKeyPhrases() != null && !entry.getKeyPhrases().isEmpty()) {
                    String phrases = entry.getKeyPhrases().stream()
                            .map(KeyPhrase::getPhrase)
                            .collect(Collectors.joining(", "));
                    context.append("Key phrases: ").append(phrases).append("\n");
                }
                context.append("---\n");
            }
        }

        // 2. Build the prompt
//        String prompt = String.format("""
//        You are a compassionate, insightful AI reflection coach. The user has shared their recent journal entries (summaries and emotions). Your task is to answer their question based on that context.
//
//        Journal context:
//        %s
//
//        User's question: %s
//
//        Answer in a warm, helpful tone. Be specific to the user's entries. If you don't know, say so honestly.
//        Keep the answer concise (2-4 sentences).
//        """, context.toString(), query);

        // 2. Build the RAG-Optimized prompt
        String prompt = String.format("""
        You are 'MyMindMirror', a compassionate and highly insightful AI reflection coach. 
        The user is asking a question about their life, emotional patterns, or past experiences.
        
        I have searched the user's secure journal database and retrieved the most relevant past entries related to their question.
        
        Relevant Journal Context:
        %s
        
        User's question: "%s"
        
        INSTRUCTIONS:
        1. Answer the user's question directly using ONLY the context provided above. 
        2. Speak directly to the user in a warm, empathetic, and conversational tone (e.g., "I see that last month you struggled with...").
        3. If the context contains the answer, synthesize it beautifully. 
        4. If the context does NOT contain the answer, politely and gently inform the user that they haven't explicitly journaled about this topic recently, but offer general, supportive advice.
        5. Keep the answer concise (3-5 sentences). Do not use markdown formatting like bolding or bullet points unless absolutely necessary.
        """, context.toString(), query);


//        // 2. Build the prompt cleanly without using String.format template parsing
//        String prompt = """
//    You are 'MyMindMirror', a compassionate and highly insightful AI reflection coach.
//    The user is asking a question about their life, emotional patterns, or past experiences.
//
//    I have searched the user's secure journal database and retrieved the most relevant past entries related to their question.
//
//    Relevant Journal Context:
//    {{CONTEXT}}
//
//    User's question: "{{QUERY}}"
//
//    INSTRUCTIONS:
//    1. Answer the user's question directly using ONLY the context provided above.
//    2. Speak directly to the user in a warm, empathetic, and conversational tone (e.g., "I see that last month you struggled with...").
//    3. If the context contains the answer, synthesize it beautifully.
//    4. If the context does NOT contain the answer, politely and gently inform the user that they haven't explicitly journaled about this topic recently, but offer general, supportive advice.
//    5. Keep the answer concise (3-5 sentences). Do not use markdown formatting like bolding or bullet points unless absolutely necessary.
//    """
//                .replace("{{CONTEXT}}", context.toString())
//                .replace("{{QUERY}}", query);


        // 3. Call AI client
        try {
            return aiClientService.generate(prompt, user.getId(), AITask.REFLECTION_CHAT);
        } catch (Exception e) {
            log.error("Error generating reflection chat", e);
            return "I'm unable to answer right now. Please try again later.";
        }
    }
*/

    @Transactional(readOnly = true)
    public String generateReflectionChat(User user, String query, String sessionId, boolean rememberChat) {
        // 1. Retrieve relevant past entries using RAG
        List<JournalEntry> relevantEntries = retrieveRelevantEntries(user, query, 5);

        StringBuilder journalContext = new StringBuilder();

        if (relevantEntries.isEmpty()) {
            log.info("RAG search yielded no results, falling back to recent entries.");
            journalContext.append("Here are the user's most recent journal entries (no specific match found for the query):\n\n");
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(30);
            List<JournalEntry> recentEntries = getJournalEntriesForUser(user, startDate, endDate);
            for (JournalEntry entry : recentEntries.stream().limit(5).collect(Collectors.toList())) {
                journalContext.append("Date: ").append(entry.getEntryDate()).append("\n");
                journalContext.append("Summary: ").append(entry.getSummary()).append("\n");
                String emotionsStr = entry.getEmotions() != null ? entry.getEmotions() : "{}";
                journalContext.append("Emotions: ").append(emotionsStr).append("\n---\n");
            }
        } else {
            log.info("RAG search successful. Feeding {} relevant entries to LLM.", relevantEntries.size());
            journalContext.append("Here are the user's most relevant past journal entries based on their question:\n\n");
            for (JournalEntry entry : relevantEntries) {
                journalContext.append("Date: ").append(entry.getEntryDate()).append("\n");
                journalContext.append("Summary: ").append(entry.getSummary()).append("\n");
                String emotionsStr = entry.getEmotions() != null ? entry.getEmotions() : "{}";
                journalContext.append("Emotions: ").append(emotionsStr).append("\n");
                if (entry.getKeyPhrases() != null && !entry.getKeyPhrases().isEmpty()) {
                    String phrases = entry.getKeyPhrases().stream()
                            .map(com.mymindmirror.backend.model.KeyPhrase::getPhrase)
                            .collect(Collectors.joining(", "));
                    journalContext.append("Key phrases: ").append(phrases).append("\n");
                }
                journalContext.append("---\n");
            }
        }

        // 2. Fetch Chat History from Redis if memory toggle is active
        StringBuilder conversationHistoryContext = new StringBuilder();
        if (rememberChat && sessionId != null && !sessionId.isBlank()) {
            List<com.mymindmirror.backend.service.ChatMemoryService.ChatMessage> history =
                    chatMemoryService.getHistory(user.getId(), sessionId);

            if (!history.isEmpty()) {
                conversationHistoryContext.append("\n==============================================\n");
                conversationHistoryContext.append("RECENT CONVERSATION HISTORY (For ongoing context):\n");
                for (com.mymindmirror.backend.service.ChatMemoryService.ChatMessage msg : history) {
                    String label = "user".equalsIgnoreCase(msg.getRole()) ? "User" : "AI Coach";
                    conversationHistoryContext.append(label).append(": ").append(msg.getContent()).append("\n");
                }
                conversationHistoryContext.append("==============================================\n");
            }
        }

        // 3. Build the RAG + Memory Unified Prompt
        String prompt = String.format("""
        You are 'MyMindMirror', a compassionate and highly insightful AI reflection coach. 
        The user is asking a question about their life, emotional patterns, or past experiences.
        
        I have searched the user's secure journal database and retrieved the most relevant past entries related to their question.
        
        Relevant Journal Context:
        %s
        %s
        
        User's current question: "%s"
        
        INSTRUCTIONS:
        1. Answer the user's question directly using the journal context and ongoing conversation history provided above.
        2. Speak directly to the user in a warm, empathetic, and conversational tone.
        3. If the context contains the answer, synthesize it beautifully. Refer to previous things they just said in the history if it helps the conversation flow naturally.
        4. If the context does NOT contain the answer, politely and gently inform the user that they haven't explicitly journaled about this topic recently, but offer general, supportive advice.
        5. Keep the answer concise (3-5 sentences). Do not use markdown formatting like bolding or bullet points unless absolutely necessary.
        """, journalContext.toString(), conversationHistoryContext.toString(), query);

        // 4. Call AI client and update memory on success
        try {
            String aiResponse = aiClientService.generate(prompt, user.getId(), AITask.REFLECTION_CHAT);

            // Log this exchange into Redis if user has opted-in
            if (rememberChat && sessionId != null && !sessionId.isBlank() && aiResponse != null) {
                chatMemoryService.appendMessage(user.getId(), sessionId, "user", query);
                chatMemoryService.appendMessage(user.getId(), sessionId, "model", aiResponse);
            }

            return aiResponse;
        } catch (Exception e) {
            log.error("Error generating reflection chat", e);
            return "I'm unable to answer right now. Please try again later.";
        }
    }

//
//    private List<JournalEntry> retrieveRelevantEntries(User user, String query, int topK) {
//        log.info("Performing vector similarity search for user: {}", user.getUsername());
//
//        try {
//            // 1. Perform similarity search using the correct SearchRequest Builder
//            org.springframework.ai.vectorstore.SearchRequest searchRequest = org.springframework.ai.vectorstore.SearchRequest.builder()
//                    .query(query)
//                    .topK(topK)
//                    .similarityThreshold(0.5) // Only return results that are at least 50% relevant
//                    .filterExpression("userId == '" + user.getId().toString() + "'")
//                    .build();
//
//            List<Document> documents = embeddingGenerationService.getVectorStore().similaritySearch(searchRequest);
//
//            if (documents == null || documents.isEmpty()) {
//                log.info("No highly relevant vectors found above threshold.");
//                return new ArrayList<>();
//            }
//
//            // 2. Extract entry IDs from metadata
//            List<UUID> entryIds = documents.stream()
//                    .map(doc -> UUID.fromString(doc.getMetadata().get("entryId").toString()))
//                    .collect(Collectors.toList());
//
//            // 3. Fetch the actual JournalEntry objects from MySQL
//            return journalEntryRepository.findAllById(entryIds).stream()
//                    .filter(Objects::nonNull)
//                    .collect(Collectors.toList());
//
//        } catch (Exception e) {
//            log.error("Failed to execute vector search: {}", e.getMessage(), e);
//            return new ArrayList<>();
//        }
//    }

//    @Transactional(readOnly = true)
//    public String generateReflectiveQuestion(User user) {
//        String cacheKey = user.getId().toString();
//        CachedQuestion cached = questionCache.get(cacheKey);
//        if (cached != null && !cached.isExpired()) {
//            log.debug("Returning cached reflective question for user {}", user.getUsername());
//            return cached.question;
//        }
//
//        LocalDate endDate = LocalDate.now();
//        LocalDate startDate = endDate.minusDays(30);
//        List<JournalEntry> entries = getJournalEntriesForUser(user, startDate, endDate);
//
//        StringBuilder context = new StringBuilder();
//        for (JournalEntry entry : entries) {
//            context.append("Date: ").append(entry.getEntryDate()).append("\n");
//            context.append("Summary: ").append(entry.getSummary()).append("\n");
//            context.append("Emotions: ").append(entry.getEmotions()).append("\n");
//            context.append("---\n");
//        }
//
//        // Build prompt (mirroring Flask)
//        String prompt = String.format("""
//            You are a compassionate AI reflection coach. Based on the user's recent journal entries (summaries and emotions), generate a single, insightful, open-ended reflective question to help the user think deeper about their emotional patterns, progress, or challenges.
//
//            **CRITICAL INSTRUCTIONS:**
//            - DO NOT output your internal thought process, reasoning, bullet points, or drafts.
//            - DO NOT use labels like "Draft 1", "Theme", or "Selected Question".
//            - Return ONLY the final question string. Absolutely no extra text.
//
//            Journal context:
//            %s
//
//            Reflective Question:""", context.toString());
//
//        try {
//            String question = aiClientService.generate(prompt, user.getId(), AITask.REFLECTIVE_QUESTION);
//            if (question == null || question.isBlank()) {
//                question = "What's one thing you've learned about yourself recently?";
//            }
//            questionCache.put(cacheKey, new CachedQuestion(question));
//            return question;
//        } catch (Exception e) {
//            log.error("Error generating reflective question", e);
//            return "What's one thing you've learned about yourself recently?";
//        }
//    }


    /**
     * UPGRADED: Private helper for AI Coach RAG.
     * Uses the same optimized mapping to feed the most relevant context to the LLM first!
     */
    private List<JournalEntry> retrieveRelevantEntries(User user, String query, int topK) {
        log.info("Performing internal vector similarity search for user: {}", user.getUsername());

        try {
            org.springframework.ai.vectorstore.SearchRequest searchRequest = org.springframework.ai.vectorstore.SearchRequest.builder()
                    .query(query)
                    .topK(topK)
                    .similarityThreshold(0.50) // Slightly lower threshold for AI context
                    .filterExpression("userId == '" + user.getId().toString() + "'")
                    .build();

            List<Document> documents = embeddingGenerationService.getVectorStore().similaritySearch(searchRequest);

            if (documents == null || documents.isEmpty()) {
                return new java.util.ArrayList<>();
            }

            // 1. Get UUIDs in EXACT order of AI relevance
            List<UUID> orderedEntryIds = documents.stream()
                    .map(doc -> UUID.fromString(doc.getMetadata().get("entryId").toString()))
                    .collect(Collectors.toList());

            // 2. Fetch from MySQL in 1 query
            List<JournalEntry> unorderedEntries = journalEntryRepository.findByIdIn(orderedEntryIds);

            // 3. Map for fast lookup
            Map<UUID, JournalEntry> entryMap = unorderedEntries.stream()
                    .collect(Collectors.toMap(JournalEntry::getId, java.util.function.Function.identity()));

            // 4. Rebuild the list in the correct Relevance Order
            List<JournalEntry> rankedEntries = new java.util.ArrayList<>();
            for (UUID id : orderedEntryIds) {
                JournalEntry entry = entryMap.get(id);
                if (entry != null) {
                    // No need to decrypt rawText here because AI Coach uses getSummary() and getEmotions()
                    rankedEntries.add(entry);
                }
            }

            return rankedEntries;

        } catch (Exception e) {
            log.error("Failed to execute internal vector search: {}", e.getMessage(), e);
            return new java.util.ArrayList<>();
        }
    }

    @Transactional(readOnly = true)
    public String generateReflectiveQuestion(User user) {
        String cacheKey = user.getId().toString();
        CachedQuestion cached = questionCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            log.debug("Returning cached reflective question for user {}", user.getUsername());
            return cached.question;
        }

        StringBuilder context = new StringBuilder();
        String currentAnchorQuery = "my recent emotional journey";
        UUID mostRecentId = null;

        // 1. PERFORMANCE OPTIMIZATION: Fetch ONLY today's entries to construct a unified anchor
        LocalDate today = LocalDate.now();
        List<JournalEntry> todayEntries = getJournalEntriesForUser(user, today, today);

        if (todayEntries != null && !todayEntries.isEmpty()) {
            // The list is already sorted by creation timestamp descending via your query rules
            mostRecentId = todayEntries.get(0).getId();

            context.append("--- CURRENTLY ON USER'S MIND TODAY ---\n");

            // Build a cohesive anchor by combining all thoughts shared today!
            StringBuilder todayCombinedSummaries = new StringBuilder();
            for (JournalEntry entry : todayEntries) {
                context.append("Entry (").append(entry.getCreationTimestamp().toLocalTime()).append("): ")
                        .append(entry.getSummary()).append("\n");

                if (entry.getSummary() != null) {
                    todayCombinedSummaries.append(entry.getSummary()).append(" ");
                }
            }
            context.append("\n");

            if (todayCombinedSummaries.length() > 0) {
                currentAnchorQuery = todayCombinedSummaries.toString().trim();
            }
        }  else {
        // Pull just the single latest historical summary as a fall-back anchor
        // Using a List instead of a Page prevents the massive 16-second COUNT(*) query!
        org.springframework.data.domain.Pageable limitOne = org.springframework.data.domain.PageRequest.of(0, 1);
        List<JournalEntry> latestList = journalEntryRepository.findLatestEntryByUser(user, limitOne);

        if (latestList != null && !latestList.isEmpty()) {
            JournalEntry latestEntry = latestList.get(0);
            mostRecentId = latestEntry.getId();
            currentAnchorQuery = latestEntry.getSummary() != null ? latestEntry.getSummary() : currentAnchorQuery;

            context.append("--- LATEST USER REFLECTION ---\n");
            context.append("Summary: ").append(currentAnchorQuery).append("\n\n");
        }
    }

        // 2. Perform Vector Search (Leveraging our ultra-fast <1ms Postgres B-Tree index)
        log.info("Executing optimized RAG vector search for reflective question.");
        List<JournalEntry> historicalParallels = retrieveRelevantEntries(user, currentAnchorQuery, 4);

        // Filter out the anchor entry so we don't present it as historical context
        if (mostRecentId != null) {
            final UUID finalMostRecentId = mostRecentId;
            historicalParallels.removeIf(entry -> entry.getId().equals(finalMostRecentId));
        }

        // 3. Populate context based on RAG results, falling back to a 30-day window if empty
        if (!historicalParallels.isEmpty()) {
            context.append("--- RELEVANT PAST HISTORY FOUND via RAG ---\n");
            for (JournalEntry entry : historicalParallels) {
                context.append("Past Date: ").append(entry.getEntryDate()).append("\n");
                context.append("Past Summary: ").append(entry.getSummary()).append("\n");
                context.append("Past Emotions: ").append(entry.getEmotions()).append("\n");
                context.append("---\n");
            }
        } else {
            log.info("RAG search yielded zero historical matches. Falling back to chronological timeline.");
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(30);

            // Re-uses your existing paginated or date-range query safely
            List<JournalEntry> standardTimeline = journalEntryRepository
                    .findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(user, startDate, endDate);

            context.append("--- CHRONOLOGICAL PAST TIMELINE (30 DAYS) ---\n");
            for (JournalEntry entry : standardTimeline.stream().limit(4).collect(Collectors.toList())) {
                context.append("Date: ").append(entry.getEntryDate()).append("\n");
                context.append("Summary: ").append(entry.getSummary()).append("\n");
                context.append("Emotions: ").append(entry.getEmotions()).append("\n");
                context.append("---\n");
            }
        }

        // 4. Build prompt cleanly
        String prompt = String.format("""
            You are a compassionate, world-class AI reflection coach named 'MyMindMirror'.
            Your goal is to look at the user's current situation and bridge it with their past history to generate a single, highly insightful, open-ended reflective question.
            
            **CRITICAL INSTRUCTIONS:**
            - DO NOT output your internal thought process, reasoning steps, bullet points, or drafts.
            - DO NOT use any markdown labels, headers, or metadata indicators.
            - Return ONLY the final question string. Absolutely no extra text.
            - Focus heavily on drawing a parallel, a contrast, or a pattern between what they are experiencing today versus what they went through in the past context.
            - Keep the tone deeply warm, empathetic, and casual.

            Journal Context Matrix:
            %s

            Reflective Question:""", context.toString());

        try {
            String question = aiClientService.generate(prompt, user.getId(), AITask.REFLECTIVE_QUESTION);
            if (question == null || question.isBlank()) {
                question = "What's one thing you've learned about yourself recently?";
            }
            questionCache.put(cacheKey, new CachedQuestion(question));
            return question;
        } catch (Exception e) {
            log.error("Error generating RAG reflective question", e);
            return "What's one thing you've learned about yourself recently?";
        }
    }

    @Cacheable(value = "keyPhraseFrequencies", key = "#user.id")
    @Transactional(readOnly = true)
    public Map<String, Long> getKeyPhraseFrequencies(User user) {
        List<JournalEntry> entries = getAllEntriesForUser(user);
        Map<String, Long> freq = new HashMap<>();
        for (JournalEntry entry : entries) {
            if (entry.getKeyPhrases() != null) {
                for (KeyPhrase kp : entry.getKeyPhrases()) {
                    String phrase = kp.getPhrase().toLowerCase();
                    freq.put(phrase, freq.getOrDefault(phrase, 0L) + 1);
                }
            }
        }
        return freq;
    }
}
