// In src/main/java/com/mymindmirror/backend/payload/JournalEntryResponse.java

package com.mymindmirror.backend.payload.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.payload.UserResponse;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
public class JournalEntryResponse {
    private UUID id;
    private UserResponse user; // Nested UserResponse

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate entryDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime creationTimestamp;

    private String rawText;

    // AI Analysis Fields
    private Double moodScore;
    private Map<String, Double> emotions; // Parsed from JSON string
    private List<String> coreConcerns; // Parsed from JSON string
    private String summary;
    private List<String> growthTips; // Parsed from JSON string
    private List<String> keyPhrases;

    // ⭐ NEW FIELD ⭐
    private Integer clusterId; // Expose the cluster ID

    public JournalEntryResponse(JournalEntry journalEntry) {
        this.id = journalEntry.getId();
        this.user = new UserResponse(journalEntry.getUser()); // Convert User to UserResponse
        this.entryDate = journalEntry.getEntryDate();
        this.creationTimestamp = journalEntry.getCreationTimestamp();
        this.rawText = journalEntry.getRawText();
        this.moodScore = journalEntry.getMoodScore();
        this.summary = journalEntry.getSummary();
        this.keyPhrases = journalEntry.getKeyPhrases() != null ? journalEntry.getKeyPhrases() : Collections.emptyList();
        // ⭐ NEW: Map clusterId directly ⭐
        this.clusterId = journalEntry.getClusterId();

        ObjectMapper objectMapper = new ObjectMapper(); // Or inject, but for DTOs often done inline
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
            // Log the error and set fields to default empty values
            System.err.println("Error parsing JSON from JournalEntry: " + e.getMessage());
            this.emotions = Collections.emptyMap();
            this.coreConcerns = Collections.emptyList();
            this.growthTips = Collections.emptyList();
        }
    }
}