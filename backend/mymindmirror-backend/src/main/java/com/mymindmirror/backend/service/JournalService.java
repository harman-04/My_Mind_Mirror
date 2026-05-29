package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.KeyPhrase;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.*;
import com.mymindmirror.backend.repository.DailyJournalSummaryRepository;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final MLServiceClient mlServiceClient;
    private final Map<String, CachedQuestion> questionCache = new ConcurrentHashMap<>();
    private final AsyncJournalAnalysisService asyncJournalAnalysisService;
    private final DailyJournalSummaryRepository dailyJournalSummaryRepository;

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
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
            // ✅ Load user association
            Hibernate.initialize(entry.getUser());
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
    public Map<String, Object> runAnomalyDetection(List<DailyAggregatedDataResponse> aggregatedData) {
        try {
            log.info("Calling ML service for anomaly detection via circuit breaker");
            List<Map<String, Object>> requestBody = aggregatedData.stream()
                    .map(data -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("date", data.getDate().toString());
                        map.put("averageMood", data.getAverageMood());
                        map.put("totalWords", data.getTotalWords());
                        return map;
                    })
                    .collect(Collectors.toList());
            Map<String, Object> mlResponse = mlServiceClient.runAnomalyDetection(requestBody, null).block();
            log.info("ML service for anomaly detection responded successfully.");
            return mlResponse;
        } catch (Exception e) {
            log.error("Failed to call ML service for anomaly detection or received error: {}", e.getMessage(), e);
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
    public ClusterResult triggerJournalClustering(User user, List<String> journalTexts, Integer nClusters) {
        log.info("Triggering journal clustering for user: {} with {} clusters and {} texts.", user.getUsername(), nClusters, journalTexts.size());

        log.info("NClusters received in JournalService.triggerJournalClustering: {}", nClusters);

        List<JournalEntry> allUserEntries = journalEntryRepository.findByUser(user);
        allUserEntries.sort(Comparator.comparing(JournalEntry::getCreationTimestamp));

        if (allUserEntries.isEmpty()) {
            log.warn("No journal entries found for user {}. Cannot perform clustering.", user.getUsername());
            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
        }

        if (journalTexts.size() != allUserEntries.size()) {
            log.error("Mismatch in journalTexts size ({}) and allUserEntries size ({}). Cannot reliably assign cluster IDs.", journalTexts.size(), allUserEntries.size());
        }

        String apiKey = apiKeyService.getDecryptedApiKey(user);
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("userId", user.getId().toString());
        requestBody.put("journalTexts", journalTexts);
        requestBody.put("nClusters", nClusters);

        ClusterResult clusterResult = null;
        try {
            log.info("Sending ML service clustering request");
            clusterResult = mlServiceClient.clusterJournalEntries(requestBody, apiKey).block();
            log.info("ML service for journal clustering responded successfully.");

            if (clusterResult != null && clusterResult.getEntryClusters() != null && !clusterResult.getEntryClusters().isEmpty()) {
                if (clusterResult.getEntryClusters().size() == allUserEntries.size()) {
                    for (int i = 0; i < allUserEntries.size(); i++) {
                        JournalEntry entry = allUserEntries.get(i);
                        entry.setClusterId(clusterResult.getEntryClusters().get(i));
                        journalEntryRepository.save(entry);
                    }
                    log.info("Updated {} journal entries with cluster IDs.", allUserEntries.size());
                } else {
                    log.error("Mismatch between number of entries ({}) and cluster IDs received ({}). Cannot reliably assign cluster IDs.", allUserEntries.size(), clusterResult.getEntryClusters().size());
                }
            } else {
                log.warn("Clustering result from ML service was empty or malformed.");
            }
        }  catch (Exception e) {
            log.error("Error during ML service call for clustering: {}", e.getMessage(), e);
            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
        }
        // If clusterResult is null (e.g., Mono.empty().block()), return fallback
        if (clusterResult == null) {
            log.warn("ML service returned null cluster result. Returning empty result.");
            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
        }
        return clusterResult;
    }

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

    @Transactional(readOnly = true)
    public List<JournalEntry> searchJournalEntriesByKeyword(User user, String keyword) {
        log.info("Searching journal entries for user: {} with keyword: '{}'", user.getUsername(), keyword);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries for keyword search.", user.getUsername());
            // Depending on desired behavior, could throw an exception or return empty list
            return List.of(); // Return empty list if decryption is not possible
        }

        // 1. Fetch all encrypted entries for the user
        List<JournalEntry> allEncryptedEntries = journalEntryRepository.findByUserOrderByCreationTimestampDesc(user);
        log.info("Fetched {} encrypted entries for user {}.", allEncryptedEntries.size(), user.getUsername());

        // 2. Decrypt each entry and then filter by keyword in memory
        String lowerCaseKeyword = keyword.toLowerCase();
        List<JournalEntry> matchingEntries = allEncryptedEntries.stream()
                .peek(entry -> {
                    // Decrypt the rawText (this part is crucial for search)
                    String decryptedText = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
                    entry.setRawText(decryptedText != null ? decryptedText : ""); // Set decrypted text, handle null if decryption fails
                    Hibernate.initialize(entry.getUser());
                    if (entry.getKeyPhrases() != null) {
                        Hibernate.initialize(entry.getKeyPhrases()); // Ensure key phrases are loaded
                    }
                })
                .filter(entry -> entry.getRawText().toLowerCase().contains(lowerCaseKeyword)) // Filter on the decrypted text
                .collect(Collectors.toList());


        log.info("Found {} journal entries matching keyword '{}' after decryption for user {}.", matchingEntries.size(), keyword, user.getUsername());
        return matchingEntries;
    }


    @Transactional(readOnly = true)
    public List<JournalEntry> searchJournalEntriesByMoodScore(User user, Double minMood, Double maxMood) {
        log.info("Searching journal entries for user: {} with mood score between {} and {}", user.getUsername(), minMood, maxMood);
        List<JournalEntry> entries = journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(user, minMood, maxMood);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            log.error("User {} has no password hash. Cannot decrypt journal entries for mood search.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
            // ✅ Load user association
            Hibernate.initialize(entry.getUser());
        }
        return entries;
    }

    /**
     * Calls the Flask ML service to generate a reflection based on provided prompt text.
     * This acts as a proxy for the frontend to get reflections without direct Flask calls.
     * @param promptText The text prompt to send to the ML service for reflection generation.
     * @return The generated reflection text.
     */
    public String generateReflectionFromMlService(String promptText, User user) {
        String apiKey = apiKeyService.getDecryptedApiKey(user);
        try {
            log.info("Calling ML service for reflection generation via circuit breaker");
            Map<String, String> mlResponse = mlServiceClient.generateReflection(promptText, apiKey).block();
            if (mlResponse != null && mlResponse.containsKey("reflection")) {
                log.info("ML service for reflection generation responded successfully.");
                return mlResponse.get("reflection");
            } else {
                log.warn("ML service for reflection generation returned null or missing 'reflection' key.");
                return "Couldn't generate a reflection today. Please try again later.";
            }
        } catch (Exception e) {
            log.error("Failed to call ML service for reflection generation or received error: {}", e.getMessage(), e);
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


    @Transactional(readOnly = true)
    public String generateReflectionChat(User user, String query) {
        // 1. Fetch recent journal entries (e.g., last 30 days, limit 10)
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        List<JournalEntry> entries = getJournalEntriesForUser(user, startDate, endDate);

        // 2. Build context: each entry as "Date: ...\nSummary: ...\nKey emotions: ..."
        StringBuilder context = new StringBuilder("Here are the user's recent journal entries:\n\n");
        for (JournalEntry entry : entries) {
            context.append("Date: ").append(entry.getEntryDate()).append("\n");
            context.append("Summary: ").append(entry.getSummary()).append("\n");
            // Add emotions as readable string
            String emotionsStr = entry.getEmotions() != null ? entry.getEmotions() : "{}";
            context.append("Emotions: ").append(emotionsStr).append("\n");
            context.append("---\n");
        }

        // 3. Call ML service
        String apiKey = apiKeyService.getDecryptedApiKey(user);
        Map<String, String> response = mlServiceClient.reflectionChat(context.toString(), query, apiKey).block();
        return response != null ? response.get("answer") : "Unable to generate response.";
    }

    @Transactional(readOnly = true)
    public String generateReflectiveQuestion(User user) {
        String cacheKey = user.getId().toString();
        CachedQuestion cached = questionCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            log.debug("Returning cached reflective question for user {}", user.getUsername());
            return cached.question;
        }

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        List<JournalEntry> entries = getJournalEntriesForUser(user, startDate, endDate);

        StringBuilder context = new StringBuilder();
        for (JournalEntry entry : entries) {
            context.append("Date: ").append(entry.getEntryDate()).append("\n");
            context.append("Summary: ").append(entry.getSummary()).append("\n");
            context.append("Emotions: ").append(entry.getEmotions()).append("\n");
            context.append("---\n");
        }

        String apiKey = apiKeyService.getDecryptedApiKey(user);
        Map<String, String> request = Map.of("context", context.toString());
        Map<String, String> response = mlServiceClient.suggestQuestion(request, apiKey).block();
        String question = response != null ? response.get("question") : null;
        if (question == null || question.isBlank()) {
            question = "What's one thing you've learned about yourself recently?";
        }

        questionCache.put(cacheKey, new CachedQuestion(question));
        return question;
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
