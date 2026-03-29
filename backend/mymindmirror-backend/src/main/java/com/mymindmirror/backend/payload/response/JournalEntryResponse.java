package com.mymindmirror.backend.payload.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.KeyPhrase; // ⭐ IMPORT THE NEW MODEL
import com.mymindmirror.backend.payload.UserResponse;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors; // ⭐ IMPORT FOR STREAMING

@Data
@NoArgsConstructor
public class JournalEntryResponse {
    private UUID id;
    private UserResponse user;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate entryDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime creationTimestamp;

    private String rawText;

    // AI Analysis Fields
    private Double moodScore;
    private Map<String, Double> emotions;
    private List<String> coreConcerns;
    private String summary;
    private List<String> growthTips;
    private List<String> keyPhrases; // Keeps the API consistent as a List of Strings

    private Integer clusterId;

    public JournalEntryResponse(JournalEntry journalEntry) {
        this.id = journalEntry.getId();
        this.user = new UserResponse(journalEntry.getUser());
        this.entryDate = journalEntry.getEntryDate();
        this.creationTimestamp = journalEntry.getCreationTimestamp();
        this.rawText = journalEntry.getRawText();
        this.moodScore = journalEntry.getMoodScore();
        this.summary = journalEntry.getSummary();
        this.clusterId = journalEntry.getClusterId();

        // ⭐ FIX: Map the KeyPhrase entity back to a simple String for the frontend
        this.keyPhrases = (journalEntry.getKeyPhrases() != null)
                ? journalEntry.getKeyPhrases().stream()
                .map(KeyPhrase::getPhrase)
                .collect(Collectors.toList())
                : Collections.emptyList();

        ObjectMapper objectMapper = new ObjectMapper();
        try {
            if (journalEntry.getEmotions() != null && !journalEntry.getEmotions().isEmpty()) {
                this.emotions = objectMapper.readValue(journalEntry.getEmotions(), new TypeReference<Map<String, Double>>() {});
            } else {
                this.emotions = Collections.emptyMap();
            }
            if (journalEntry.getCoreConcerns() != null && !journalEntry.getCoreConcerns().isEmpty()) {
                this.coreConcerns = objectMapper.readValue(journalEntry.getCoreConcerns(), new TypeReference<List<String>>() {});
            } else {
                this.coreConcerns = Collections.emptyList();
            }
            if (journalEntry.getGrowthTips() != null && !journalEntry.getGrowthTips().isEmpty()) {
                this.growthTips = objectMapper.readValue(journalEntry.getGrowthTips(), new TypeReference<List<String>>() {});
            } else {
                this.growthTips = Collections.emptyList();
            }

        } catch (JsonProcessingException e) {
            System.err.println("Error parsing JSON from JournalEntry: " + e.getMessage());
            this.emotions = Collections.emptyMap();
            this.coreConcerns = Collections.emptyList();
            this.growthTips = Collections.emptyList();
        }
    }
}