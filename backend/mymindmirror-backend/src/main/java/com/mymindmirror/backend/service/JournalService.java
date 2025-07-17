package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.payload.MoodDataResponse;
import com.mymindmirror.backend.payload.DailyAggregatedDataResponse;
import com.mymindmirror.backend.payload.ClusterResult;
import com.mymindmirror.backend.util.EncryptionUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import org.hibernate.Hibernate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class for managing JournalEntry-related business logic.
 * Handles saving, retrieving, updating, deleting, and orchestrating AI analysis for journal entries.
 */
@Service
public class JournalService {

    private static final Logger logger = LoggerFactory.getLogger(JournalService.class);

    private final JournalEntryRepository journalEntryRepository;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final UserService userService;

    @Value("${app.ml-service.url}")
    private String mlServiceBaseUrl;

    public JournalService(JournalEntryRepository journalEntryRepository, WebClient mlServiceWebClient, ObjectMapper objectMapper, UserService userService) {
        this.journalEntryRepository = journalEntryRepository;
        this.webClient = mlServiceWebClient;
        this.objectMapper = objectMapper;
        this.userService = userService;
    }

    /**
     * Saves a new journal entry. Always triggers AI analysis for new entries.
     * @param user The authenticated user creating the entry.
     * @param rawText The raw journal text provided by the user.
     * @return The saved JournalEntry entity with AI analysis results.
     */
    public JournalEntry saveJournalEntry(User user, String rawText) {
        logger.info("Attempting to save new journal entry for user: {}", user.getUsername());

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot encrypt journal entry.", user.getUsername());
            throw new IllegalStateException("User secret (password hash) not available for encryption.");
        }

        JournalEntry newEntry = new JournalEntry();
        newEntry.setUser(user);
        newEntry.setEntryDate(LocalDate.now());
        newEntry.setCreationTimestamp(LocalDateTime.now());
        newEntry.setClusterId(null); // New entries don't have a cluster ID initially

        String actualRawText = (rawText != null) ? rawText : ""; // Ensure actualRawText is never null

        logger.info("JournalService.saveJournalEntry: actualRawText before encryption: '{}' (length: {})",
                actualRawText, actualRawText.length());
        logger.info("JournalService.saveJournalEntry: actualRawText.trim().isEmpty(): {}", actualRawText.trim().isEmpty());


        String encryptedText = EncryptionUtil.encrypt(actualRawText, userSecret);
        if (encryptedText == null) {
            logger.error("Failed to encrypt journal entry for user {}. Saving raw text unencrypted.", user.getUsername());
            newEntry.setRawText(actualRawText); // Fallback to actualRawText (guaranteed non-null, possibly empty)
        } else {
            newEntry.setRawText(encryptedText);
        }

        if (!actualRawText.trim().isEmpty()) {
            processAiAnalysis(actualRawText, newEntry);
        } else {
            logger.warn("Raw text is empty for new entry. Skipping AI analysis and resetting fields.");
            resetAiFields(newEntry);
        }

        JournalEntry savedEntry = journalEntryRepository.save(newEntry);
        logger.info("New journal entry with ID {} for user {} saved successfully.", savedEntry.getId(), user.getUsername());
        return savedEntry;
    }

    /**
     * Updates an existing journal entry.
     * Re-runs AI analysis only if the raw text content has changed.
     * @param entryId The ID of the entry to update.
     * @param user The authenticated user (for ownership check).
     * @param updatedText The new raw text for the entry.
     * @return The updated JournalEntry entity.
     * @throws IllegalArgumentException if entry not found or not owned by user.
     */
    public JournalEntry updateJournalEntry(UUID entryId, User user, String updatedText) {
        logger.info("Attempting to update journal entry with ID: {} for user: {}", entryId, user.getUsername());
        JournalEntry existingEntry = journalEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Journal entry not found with ID: " + entryId));

        if (!existingEntry.getUser().getId().equals(user.getId())) {
            logger.warn("User {} attempted to update entry {} not owned by them.", user.getUsername(), entryId);
            throw new IllegalArgumentException("You are not authorized to update this journal entry.");
        }

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot encrypt journal entry.", user.getUsername());
            throw new IllegalStateException("User secret (password hash) not available for encryption.");
        }

        String textToEncrypt = (updatedText != null) ? updatedText : ""; // Ensure textToEncrypt is never null

        logger.info("JournalService.updateJournalEntry: textToEncrypt before encryption: '{}' (length: {})",
                textToEncrypt, textToEncrypt.length());
        logger.info("JournalService.updateJournalEntry: textToEncrypt.trim().isEmpty(): {}", textToEncrypt.trim().isEmpty());


        String decryptedOldText = EncryptionUtil.decrypt(existingEntry.getRawText(), userSecret);

        boolean textContentChanged = !textToEncrypt.equals(decryptedOldText);

        String encryptedText = EncryptionUtil.encrypt(textToEncrypt, userSecret);
        if (encryptedText == null) {
            logger.error("Failed to encrypt updated journal entry for user {}. Saving raw text unencrypted.", user.getUsername());
            existingEntry.setRawText(textToEncrypt); // Fallback to textToEncrypt (guaranteed non-null, possibly empty)
        } else {
            existingEntry.setRawText(encryptedText);
        }

        if (textContentChanged) {
            logger.info("Journal entry text content changed for ID {}. Re-running AI analysis.", entryId);
            if (!textToEncrypt.trim().isEmpty()) {
                processAiAnalysis(textToEncrypt, existingEntry);
            } else {
                logger.warn("Updated text is empty for entry {}. Skipping AI analysis and resetting fields.", entryId);
                resetAiFields(existingEntry);
            }
        } else {
            logger.info("Journal entry text content for ID {} is unchanged. Skipping AI analysis.", entryId);
        }

        JournalEntry savedEntry = journalEntryRepository.save(existingEntry);
        logger.info("Journal entry with ID {} for user {} updated successfully.", savedEntry.getId(), user.getUsername());
        return savedEntry;
    }

    /**
     * Deletes a journal entry.
     * @param entryId The ID of the entry to delete.
     * @param user The authenticated user (for ownership check).
     * @throws IllegalArgumentException if entry not found or not owned by user.
     */
    public void deleteJournalEntry(UUID entryId, User user) {
        logger.info("Attempting to delete journal entry with ID: {} for user: {}", entryId, user.getUsername());
        JournalEntry existingEntry = journalEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Journal entry not found with ID: " + entryId));

        if (!existingEntry.getUser().getId().equals(user.getId())) {
            logger.warn("User {} attempted to delete entry {} not owned by them.", user.getUsername(), entryId);
            throw new IllegalArgumentException("You are not authorized to delete this journal entry.");
        }

        journalEntryRepository.delete(existingEntry);
        logger.info("Journal entry with ID {} for user {} deleted successfully.", entryId, user.getUsername());
    }

    /**
     * Helper method to call ML service for general journal analysis and update JournalEntry fields.
     */
    private void processAiAnalysis(String textForAnalysis, JournalEntry entryToUpdate) {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("text", textForAnalysis);

        Map<String, Object> mlResponse = null;
        try {
            logger.info("Calling ML service for journal analysis at {}/analyze_journal", mlServiceBaseUrl);
            mlResponse = webClient.post()
                    .uri("/ml/journal/analyze_journal")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            logger.info("ML service for journal analysis responded successfully.");
        } catch (Exception e) {
            logger.error("Failed to call ML service for journal analysis or received error: {}", e.getMessage(), e);
        }

        if (mlResponse != null) {
            try {
                Object moodScoreObj = mlResponse.get("moodScore");
                if (moodScoreObj instanceof Number) {
                    entryToUpdate.setMoodScore(((Number) moodScoreObj).doubleValue());
                } else {
                    entryToUpdate.setMoodScore(null);
                    logger.warn("MoodScore from ML service was not a Number. Value: {}", moodScoreObj);
                }

                entryToUpdate.setEmotions(mlResponse.get("emotions") != null ? objectMapper.writeValueAsString(mlResponse.get("emotions")) : null);
                entryToUpdate.setCoreConcerns(mlResponse.get("coreConcerns") != null ? objectMapper.writeValueAsString(mlResponse.get("coreConcerns")) : null);
                entryToUpdate.setSummary((String) mlResponse.get("summary"));
                entryToUpdate.setGrowthTips(mlResponse.get("growthTips") != null ? objectMapper.writeValueAsString(mlResponse.get("growthTips")) : null);

                List<String> keyPhrasesFromMl = (List<String>) mlResponse.getOrDefault("keyPhrases", Collections.emptyList());
                entryToUpdate.setKeyPhrases(keyPhrasesFromMl);

                logger.info("Journal entry AI analysis results processed.");
            } catch (JsonProcessingException e) {
                logger.error("Error serializing ML response to JSON string for DB storage: {}", e.getMessage(), e);
                resetAiFields(entryToUpdate);
            } catch (ClassCastException e) {
                logger.error("Type casting error from ML response: {}. This might indicate unexpected data types from Flask.", e.getMessage(), e);
                resetAiFields(entryToUpdate);
            }
        } else {
            logger.warn("ML service response was null. Journal entry saved/updated without AI analysis.");
            resetAiFields(entryToUpdate);
        }
    }

    /**
     * Helper method to reset AI fields if analysis fails.
     */
    private void resetAiFields(JournalEntry entry) {
        entry.setMoodScore(null);
        entry.setEmotions(null);
        entry.setCoreConcerns(null);
        entry.setSummary(null);
        entry.setGrowthTips(null);
        entry.setKeyPhrases(Collections.emptyList());
        entry.setClusterId(null);
    }

    /**
     * Fetches journal entries for a user within a date range, ordered by creation timestamp.
     * Decrypts rawText after fetching.
     */
    public List<JournalEntry> getJournalEntriesForUser(User user, LocalDate startDate, LocalDate endDate) {
        logger.info("Fetching journal entries for user: {} from {} to {}", user.getUsername(), startDate, endDate);
        List<JournalEntry> entries = journalEntryRepository.findByUserAndEntryDateBetweenOrderByCreationTimestampDesc(user, startDate, endDate);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot decrypt journal entries.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
        }
        return entries;
    }

    /**
     * Decrypts rawText after fetching.
     */
    public Optional<JournalEntry> getJournalEntryById(UUID entryId) {
        logger.info("Fetching journal entry by ID: {}", entryId);
        Optional<JournalEntry> entryOptional = journalEntryRepository.findById(entryId);
        entryOptional.ifPresent(entry -> {
            User user = userService.findByUsername(entry.getUser().getUsername())
                    .orElseThrow(() -> new IllegalStateException("User not found for entry ID: " + entryId));
            String userSecret = user.getPasswordHash();
            if (userSecret == null || userSecret.isEmpty()) {
                logger.error("User {} has no password hash. Cannot decrypt journal entry with ID {}.", user.getUsername(), entryId);
            } else {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
        });
        return entryOptional;
    }

    public List<MoodDataResponse> getMoodDataForChart(User user, LocalDate startDate, LocalDate endDate) {
        logger.info("Fetching mood data for chart for user: {} from {} to {}", user.getUsername(), startDate, endDate);
        List<JournalEntry> entries = journalEntryRepository.findByUserAndEntryDateBetween(user, startDate, endDate);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot decrypt journal entries for mood chart.", user.getUsername());
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
    public List<DailyAggregatedDataResponse> getDailyAggregatedDataForUser(User user, LocalDate startDate, LocalDate endDate) {
        logger.info("Fetching daily aggregated data for user: {} from {} to {}", user.getUsername(), startDate, endDate);
        List<Object[]> results = journalEntryRepository.findDailyAggregatedDataByUserAndDateRange(user.getId(), startDate, endDate);

        return results.stream()
                .map(row -> {
                    LocalDate date = (LocalDate) row[0];
                    Double avgMood = row[1] != null ? ((Number) row[1]).doubleValue() : null;
                    Long totalWords = row[2] != null ? ((Number) row[2]).longValue() : null;
                    return new DailyAggregatedDataResponse(date, avgMood, totalWords);
                })
                .collect(Collectors.toList());
    }

    /**
     * Method to call Flask ML service for anomaly detection.
     * @param aggregatedData A list of DailyAggregatedDataResponse objects to send to Flask.
     * @return A Map containing anomaly detection results from Flask.
     */
    public Map<String, Object> runAnomalyDetection(List<DailyAggregatedDataResponse> aggregatedData) {
        try {
            logger.info("Calling ML service for anomaly detection at {}/anomaly_detection with {} data points.", mlServiceBaseUrl, aggregatedData.size());
            List<Map<String, Object>> requestBody = aggregatedData.stream()
                    .map(data -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("date", data.getDate().toString());
                        map.put("averageMood", data.getAverageMood());
                        map.put("totalWords", data.getTotalWords());
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> mlResponse = webClient.post()
                    .uri("/ml/journal/anomaly_detection")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            logger.info("ML service for anomaly detection responded successfully.");
            return mlResponse;
        } catch (Exception e) {
            logger.error("Failed to call ML service for anomaly detection or received error: {}", e.getMessage(), e);
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
        logger.info("Triggering journal clustering for user: {} with {} clusters and {} texts.", user.getUsername(), nClusters, journalTexts.size());

        logger.info("NClusters received in JournalService.triggerJournalClustering: {}", nClusters);

        List<JournalEntry> allUserEntries = journalEntryRepository.findByUser(user);
        allUserEntries.sort(Comparator.comparing(JournalEntry::getCreationTimestamp));

        if (allUserEntries.isEmpty()) {
            logger.warn("No journal entries found for user {}. Cannot perform clustering.", user.getUsername());
            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList());
        }

        if (journalTexts.size() != allUserEntries.size()) {
            logger.error("Mismatch in journalTexts size ({}) and allUserEntries size ({}). Cannot reliably assign cluster IDs.", journalTexts.size(), allUserEntries.size());
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("userId", user.getId().toString());
        requestBody.put("journalTexts", journalTexts);
        requestBody.put("nClusters", nClusters);
        logger.info("NClusters being put into Flask requestBody: {}", requestBody.get("nClusters"));

        ClusterResult clusterResult = null;
        try {
            String requestBodyJson = objectMapper.writeValueAsString(requestBody);
            logger.info("Sending ML service clustering request: {}", requestBodyJson);

            logger.info("Calling ML service for journal clustering at {}/cluster_journal_entries", mlServiceBaseUrl);
            clusterResult = webClient.post()
                    .uri("/ml/journal/cluster_journal_entries")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(ClusterResult.class)
                    .block();
            logger.info("ML service for journal clustering responded successfully.");

            if (clusterResult != null && clusterResult.getEntryClusters() != null && !clusterResult.getEntryClusters().isEmpty()) {
                if (clusterResult.getEntryClusters().size() == allUserEntries.size()) {
                    for (int i = 0; i < allUserEntries.size(); i++) {
                        JournalEntry entry = allUserEntries.get(i);
                        entry.setClusterId(clusterResult.getEntryClusters().get(i));
                        journalEntryRepository.save(entry);
                    }
                    logger.info("Updated {} journal entries with cluster IDs.", allUserEntries.size());
                } else {
                    logger.error("Mismatch between number of entries ({}) and cluster IDs received ({}). Cannot reliably assign cluster IDs.", allUserEntries.size(), clusterResult.getEntryClusters().size());
                }
            } else {
                logger.warn("Clustering result from ML service was empty or malformed. No entries updated with cluster IDs.");
            }

        } catch (JsonProcessingException e) {
            logger.error("Error serializing clustering request body: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to serialize clustering request.", e);
        } catch (Exception e) {
            logger.error("Error during ML service call for clustering: {}", e.getMessage(), e);
            return new ClusterResult(0, Collections.emptyMap(), Collections.emptyList()); // Return empty result on error
        }
        return clusterResult;
    }

    /**
     * Fetches all journal entries for a user (used by clustering).
     * Decrypts rawText after fetching.
     */
    public List<JournalEntry> findByUser(User user) {
        List<JournalEntry> entries = journalEntryRepository.findByUser(user);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot decrypt journal entries for findByUser.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
        }
        return entries;
    }

    // ⭐ MODIFIED METHOD FOR KEYWORD SEARCH ⭐
    public List<JournalEntry> searchJournalEntriesByKeyword(User user, String keyword) {
        logger.info("Searching journal entries for user: {} with keyword: '{}'", user.getUsername(), keyword);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot decrypt journal entries for keyword search.", user.getUsername());
            // Depending on desired behavior, could throw an exception or return empty list
            return List.of(); // Return empty list if decryption is not possible
        }

        // 1. Fetch all encrypted entries for the user
        List<JournalEntry> allEncryptedEntries = journalEntryRepository.findByUserOrderByCreationTimestampDesc(user);
        logger.info("Fetched {} encrypted entries for user {}.", allEncryptedEntries.size(), user.getUsername());

        // 2. Decrypt each entry and then filter by keyword in memory
        String lowerCaseKeyword = keyword.toLowerCase();
        List<JournalEntry> matchingEntries = allEncryptedEntries.stream()
                .peek(entry -> {
                    // Decrypt the rawText (this part is crucial for search)
                    String decryptedText = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
                    entry.setRawText(decryptedText != null ? decryptedText : ""); // Set decrypted text, handle null if decryption fails
                    if (entry.getKeyPhrases() != null) {
                        Hibernate.initialize(entry.getKeyPhrases()); // Ensure key phrases are loaded
                    }
                })
                .filter(entry -> entry.getRawText().toLowerCase().contains(lowerCaseKeyword)) // Filter on the decrypted text
                .collect(Collectors.toList());

        logger.info("Found {} journal entries matching keyword '{}' after decryption for user {}.", matchingEntries.size(), keyword, user.getUsername());
        return matchingEntries;
    }


    // ⭐ NEW METHOD FOR MOOD SCORE RANGE SEARCH ⭐
    public List<JournalEntry> searchJournalEntriesByMoodScore(User user, Double minMood, Double maxMood) {
        logger.info("Searching journal entries for user: {} with mood score between {} and {}", user.getUsername(), minMood, maxMood);
        List<JournalEntry> entries = journalEntryRepository.findByUserAndMoodScoreBetweenOrderByCreationTimestampDesc(user, minMood, maxMood);

        String userSecret = user.getPasswordHash();
        if (userSecret == null || userSecret.isEmpty()) {
            logger.error("User {} has no password hash. Cannot decrypt journal entries for mood search.", user.getUsername());
        }

        for (JournalEntry entry : entries) {
            if (userSecret != null && !userSecret.isEmpty()) {
                entry.setRawText(EncryptionUtil.decrypt(entry.getRawText(), userSecret));
            }
            if (entry.getKeyPhrases() != null) {
                Hibernate.initialize(entry.getKeyPhrases());
            }
        }
        return entries;
    }

    /**
     * ⭐ NEW METHOD ⭐
     * Calls the Flask ML service to generate a reflection based on provided prompt text.
     * This acts as a proxy for the frontend to get reflections without direct Flask calls.
     * @param promptText The text prompt to send to the ML service for reflection generation.
     * @return The generated reflection text.
     */
    public String generateReflectionFromMlService(String promptText) {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("prompt_text", promptText);

        try {
            logger.info("Calling ML service for reflection generation at {}/generate_reflection", mlServiceBaseUrl);
            Map<String, String> mlResponse = webClient.post()
                    .uri("/generate_reflection")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (mlResponse != null && mlResponse.containsKey("reflection")) {
                logger.info("ML service for reflection generation responded successfully.");
                return mlResponse.get("reflection");
            } else {
                logger.warn("ML service for reflection generation returned null or missing 'reflection' key.");
                return "Couldn't generate a reflection today. Please try again later.";
            }
        } catch (Exception e) {
            logger.error("Failed to call ML service for reflection generation or received error: {}", e.getMessage(), e);
            return "Failed to generate reflection due to an internal error.";
        }
    }
}
