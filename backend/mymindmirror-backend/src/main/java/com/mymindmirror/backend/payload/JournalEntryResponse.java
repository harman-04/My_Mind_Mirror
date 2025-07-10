// JournalEntryResponse.java
package com.mymindmirror.backend.payload;

import com.mymindmirror.backend.model.JournalEntry;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * DTO for outgoing journal entry responses to the frontend.
 * Includes parsed AI analysis results.
 */
@Data
@NoArgsConstructor // Lombok generates no-arg constructor
public class JournalEntryResponse {

    private static final Logger logger = LoggerFactory.getLogger(JournalEntryResponse.class);
    private static final ObjectMapper objectMapper = new ObjectMapper(); // Re-use ObjectMapper

    private UUID id;
    private LocalDate entryDate;
    private String rawText;
    private Double moodScore;
    private Map<String, Double> emotions; // Parsed from JSON string
    private List<String> coreConcerns; // Parsed from JSON string
    private String summary;
    private List<String> growthTips; // Parsed from JSON string

    // Constructor to convert JournalEntry entity to JournalEntryResponse DTO
    public JournalEntryResponse(JournalEntry entry) {
        this.id = entry.getId();
        this.entryDate = entry.getEntryDate();
        this.rawText = entry.getRawText();
        this.moodScore = entry.getMoodScore();
        this.summary = entry.getSummary();

        // Parse JSON strings back into Java objects for the frontend
        try {
            if (entry.getEmotions() != null) {
                this.emotions = objectMapper.readValue(entry.getEmotions(), Map.class);
            }
            if (entry.getCoreConcerns() != null) {
                this.coreConcerns = objectMapper.readValue(entry.getCoreConcerns(), List.class);
            }
            if (entry.getGrowthTips() != null) {
                this.growthTips = objectMapper.readValue(entry.getGrowthTips(), List.class);
            }
        } catch (JsonProcessingException e) {
            logger.error("Error parsing JSON from JournalEntry entity: {}", e.getMessage(), e);
            // Set to null or empty defaults if parsing fails
            this.emotions = null;
            this.coreConcerns = null;
            this.growthTips = null;
        }
    }
}