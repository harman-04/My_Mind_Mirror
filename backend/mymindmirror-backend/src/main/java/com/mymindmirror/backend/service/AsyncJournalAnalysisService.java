package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.KeyPhrase;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncJournalAnalysisService {

    private final JournalEntryRepository journalEntryRepository;
    private final UserService userService;
    private final ApiKeyService apiKeyService;
    private final MLServiceClient mlServiceClient;
    private final ObjectMapper objectMapper;

    @Async
    @Transactional
    public void analyzeJournalEntryAsync(UUID entryId, String decryptedRawText, UUID userId) {
        log.info("Starting async analysis for entry: {}", entryId);

        try {
            var user = userService.findById(userId).orElse(null);
            if (user == null) {
                log.error("User not found for async analysis, entry: {}", entryId);
                return;
            }

            // ✅ Use plain findById without keyPhrases to avoid orphan deletion tracking
            var entry = journalEntryRepository.findById(entryId).orElse(null);
            if (entry == null) {
                log.warn("Entry {} was deleted before async analysis could complete", entryId);
                return;
            }

            String apiKey = apiKeyService.getDecryptedApiKey(user);
            Map<String, Object> mlResponse = null;
            try {
                mlResponse = mlServiceClient.analyzeJournal(decryptedRawText, apiKey).block();
            } catch (Exception e) {
                log.error("ML service call failed for entry {}: {}", entryId, e.getMessage());
            }

            if (mlResponse != null) {
                updateEntryWithAnalysis(entry, mlResponse);
                journalEntryRepository.save(entry);
                log.info("Async analysis completed for entry: {}", entryId);
            } else {
                log.warn("ML response was null for entry {}, leaving placeholder", entryId);
            }
        } catch (Exception e) {
            log.error("Async analysis failed for entry {}: {}", entryId, e.getMessage(), e);
        }
    }

    // In AsyncJournalAnalysisService.java

    private void updateEntryWithAnalysis(JournalEntry entry, Map<String, Object> mlResponse) {
        try {
            Object moodScoreObj = mlResponse.get("moodScore");
            if (moodScoreObj instanceof Number) {
                entry.setMoodScore(((Number) moodScoreObj).doubleValue());
            } else {
                entry.setMoodScore(null);
            }

            entry.setEmotions(mlResponse.get("emotions") != null ? objectMapper.writeValueAsString(mlResponse.get("emotions")) : null);
            entry.setCoreConcerns(mlResponse.get("coreConcerns") != null ? objectMapper.writeValueAsString(mlResponse.get("coreConcerns")) : null);
            entry.setSummary((String) mlResponse.get("summary"));
            entry.setGrowthTips(mlResponse.get("growthTips") != null ? objectMapper.writeValueAsString(mlResponse.get("growthTips")) : null);

            List<String> keyPhrasesFromMl = (List<String>) mlResponse.getOrDefault("keyPhrases", Collections.emptyList());

            // Clear existing keyPhrases – this will load the lazy collection if needed
            // Hibernate will delete the old ones via orphan removal
            entry.getKeyPhrases().clear();

            // Add new key phrases
            List<KeyPhrase> newKeyPhrases = keyPhrasesFromMl.stream()
                    .map(phrase -> new KeyPhrase(phrase, entry))
                    .collect(Collectors.toList());
            entry.getKeyPhrases().addAll(newKeyPhrases);

        } catch (JsonProcessingException e) {
            log.error("Error serializing ML response for entry {}: {}", entry.getId(), e.getMessage());
        }
    }
}