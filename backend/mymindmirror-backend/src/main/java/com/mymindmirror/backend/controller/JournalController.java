// src/main/java/com/mymindmirror.backend/controller/JournalController.java

package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.JournalEntryRequest;
import com.mymindmirror.backend.payload.request.ClusterRequest; // ⭐ NEW IMPORT ⭐
import com.mymindmirror.backend.payload.response.JournalEntryResponse;
import com.mymindmirror.backend.payload.MoodDataResponse;
import com.mymindmirror.backend.payload.ClusterResult;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST Controller for managing journal entries.
 * Handles API requests related to creating, retrieving, updating, and deleting journal data.
 */
@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private static final Logger logger = LoggerFactory.getLogger(JournalController.class);

    private final JournalService journalService;
    private final UserService userService;

    public JournalController(JournalService journalService, UserService userService) {
        this.journalService = journalService;
        this.userService = userService;
    }

    /**
     * Helper method to retrieve the authenticated User entity from the SecurityContext.
     * @return The User entity.
     * @throws RuntimeException if authenticated user is not found in the database.
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        logger.debug("Attempting to retrieve current user: {}", username);
        return userService.findByUsername(username)
                .orElseThrow(() -> {
                    logger.error("Authenticated user '{}' not found in database. This indicates a security misconfiguration.", username);
                    return new RuntimeException("Authenticated user not found.");
                });
    }

    /**
     * Creates a new journal entry. Each call creates a distinct entry.
     * @param request JournalEntryRequest containing the raw text.
     * @return ResponseEntity with the created JournalEntryResponse.
     */
    @PostMapping
    public ResponseEntity<JournalEntryResponse> createJournalEntry(@RequestBody JournalEntryRequest request) {
        logger.info("Received request to create journal entry.");
        try {
            User currentUser = getCurrentUser();
            JournalEntry savedEntry = journalService.saveJournalEntry(currentUser, request.getText());
            logger.info("New journal entry saved successfully for user {}.", currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(new JournalEntryResponse(savedEntry));
        } catch (IllegalArgumentException e) {
            logger.error("Error creating journal entry: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); // Return 400 without body for simplicity
        } catch (IllegalStateException e) {
            logger.error("Server configuration error for encryption: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            logger.error("Unexpected error creating journal entry: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Updates an existing journal entry for the authenticated user.
     * @param id The UUID of the journal entry to update.
     * @param request JournalEntryRequest containing the updated raw text.
     * @return ResponseEntity with the updated JournalEntryResponse.
     */
    @PutMapping("/{id}")
    public ResponseEntity<JournalEntryResponse> updateJournalEntry(@PathVariable UUID id, @RequestBody JournalEntryRequest request) {
        logger.info("Received request to update journal entry with ID: {}", id);
        try {
            User currentUser = getCurrentUser();
            JournalEntry updatedEntry = journalService.updateJournalEntry(id, currentUser, request.getText());
            logger.info("Journal entry with ID {} updated successfully for user {}.", id, currentUser.getUsername());
            return ResponseEntity.ok(new JournalEntryResponse(updatedEntry));
        } catch (IllegalArgumentException e) {
            logger.warn("Update failed for entry ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); // Or more specific status based on e.getMessage()
        } catch (IllegalStateException e) {
            logger.error("Server configuration error for encryption during update: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            logger.error("Error updating journal entry with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Deletes a journal entry for the authenticated user.
     * @param id The UUID of the journal entry to delete.
     * @return ResponseEntity with no content on success.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJournalEntry(@PathVariable UUID id) {
        logger.info("Received request to delete journal entry with ID: {}", id);
        try {
            User currentUser = getCurrentUser();
            journalService.deleteJournalEntry(id, currentUser);
            logger.info("Journal entry with ID {} deleted successfully for user {}.", id, currentUser.getUsername());
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (IllegalArgumentException e) {
            logger.warn("Delete failed for entry ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); // Or more specific status based on e.getMessage()
        } catch (Exception e) {
            logger.error("Error deleting journal entry with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Retrieves journal history for the authenticated user.
     * @param startDate Optional start date for filtering.
     * @param endDate Optional end date for filtering.
     * @return List of JournalEntryResponse objects.
     */
    @GetMapping("/history")
    public ResponseEntity<List<JournalEntryResponse>> getJournalHistory(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        logger.info("Received request for journal history.");
        User currentUser = getCurrentUser();
        LocalDate start = LocalDate.now().minusDays(30); // Default to last 30 days
        LocalDate end = LocalDate.now();

        try {
            if (startDate != null) {
                start = LocalDate.parse(startDate);
            }
            if (endDate != null) {
                end = LocalDate.parse(endDate);
            }
        } catch (DateTimeParseException e) {
            logger.error("Invalid date format provided: {}. Using default date range.", e.getMessage());
            return ResponseEntity.badRequest().build(); // Changed to build() as per your style
        }

        List<JournalEntry> entries = journalService.getJournalEntriesForUser(currentUser, start, end);
        logger.info("Found {} journal entries for user {} in range {} to {}.", entries.size(), currentUser.getUsername(), start, end);
        List<JournalEntryResponse> responses = entries.stream()
                .map(JournalEntryResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    /**
     * Retrieves mood data for charts for the authenticated user.
     * This method will need to be adapted later to handle multiple entries per day for aggregation.
     * For now, it still fetches all entries within the range.
     */
    @GetMapping("/mood-data")
    public ResponseEntity<List<MoodDataResponse>> getMoodData(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        logger.info("Received request for mood data for chart.");
        User currentUser = getCurrentUser();
        LocalDate start = LocalDate.now().minusDays(30);
        LocalDate end = LocalDate.now();

        try {
            if (startDate != null) {
                start = LocalDate.parse(startDate);
            }
            if (endDate != null) {
                end = LocalDate.parse(endDate);
            }
        } catch (DateTimeParseException e) {
            logger.error("Invalid date format provided: {}. Using default date range.", e.getMessage());
            return ResponseEntity.badRequest().build(); // Changed to build()
        }

        List<MoodDataResponse> moodData = journalService.getMoodDataForChart(currentUser, start, end);
        logger.info("Found {} mood data points for user {} in range {} to {}.", moodData.size(), currentUser.getUsername(), start, end);
        return ResponseEntity.ok(moodData);
    }

    /**
     * Retrieves a single journal entry by ID for the authenticated user.
     */
    @GetMapping("/{id}")
    public ResponseEntity<JournalEntryResponse> getJournalEntry(@PathVariable UUID id) {
        logger.info("Received request for journal entry with ID: {}.", id);
        User currentUser = getCurrentUser();
        return journalService.getJournalEntryById(id)
                .filter(entry -> entry.getUser().getId().equals(currentUser.getId())) // Ensure ownership
                .map(JournalEntryResponse::new)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    logger.warn("Journal entry with ID {} not found or not owned by user {}.", id, currentUser.getUsername());
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Retrieves recurring themes/keyword trends for the authenticated user.
     * This endpoint aggregates key phrases from all entries within a date range.
     */
    @GetMapping("/trends")
    public ResponseEntity<Map<String, Long>> getJournalTrends(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "10") int limit) { // Limit for top N themes
        logger.info("Received request for journal trends.");
        User currentUser = getCurrentUser();
        LocalDate start = LocalDate.now().minusDays(90); // Default to last 90 days for trends
        LocalDate end = LocalDate.now();

        try {
            if (startDate != null) {
                start = LocalDate.parse(startDate);
            }
            if (endDate != null) {
                end = LocalDate.parse(endDate);
            }
        } catch (DateTimeParseException e) {
            logger.error("Invalid date format provided for trends: {}. Using default date range.", e.getMessage());
            return ResponseEntity.badRequest().build(); // Changed to build()
        }

        List<JournalEntry> entries = journalService.getJournalEntriesForUser(currentUser, start, end);

        Map<String, Long> trendCounts = entries.stream()
                .filter(entry -> entry.getKeyPhrases() != null)
                .flatMap(entry -> entry.getKeyPhrases().stream())
                .collect(Collectors.groupingBy(phrase -> phrase, Collectors.counting()));

        Map<String, Long> topTrends = trendCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        java.util.LinkedHashMap::new
                ));

        logger.info("Found {} top trends for user {} in range {} to {}.", topTrends.size(), currentUser.getUsername(), start, end);
        return ResponseEntity.ok(topTrends);
    }

    /**
     * Triggers journal entry clustering for the authenticated user.
     * This will train/update a personalized clustering model and assign cluster IDs to entries.
     *
     * @param clusterRequest The request body containing the desired number of clusters and journal texts.
     * @return A ClusterResult object containing cluster themes and entry-to-cluster mappings.
     */
    // Inside clusterJournalEntries method
    @PostMapping("/cluster-entries")
    public ResponseEntity<ClusterResult> clusterJournalEntries(
            @RequestBody ClusterRequest clusterRequest) {
        logger.info("Received request to cluster journal entries for current user.");
        // This log already exists and is good:
        logger.info("ClusterRequest received: numClusters={}, userId={}, journalTextsSize={}",
                clusterRequest.getNClusters(), clusterRequest.getUserId(), clusterRequest.getJournalTexts() != null ? clusterRequest.getJournalTexts().size() : 0);

        // ⭐ ADD THIS NEW LOG HERE ⭐
        logger.info("NClusters from ClusterRequest before passing to service: {}", clusterRequest.getNClusters());

        User currentUser = getCurrentUser();
        try {
            ClusterResult result = journalService.triggerJournalClustering(
                    currentUser,
                    clusterRequest.getJournalTexts(),
                    clusterRequest.getNClusters()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error triggering journal clustering: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new ClusterResult(0, Collections.emptyMap(), Collections.emptyList())
            );
        }
    }

    // ⭐ NEW ENDPOINT FOR KEYWORD SEARCH ⭐
    /**
     * Searches journal entries for the authenticated user by a keyword in the raw text.
     * @param keyword The keyword to search for.
     * @return ResponseEntity with a list of matching JournalEntryResponse objects.
     */
    @GetMapping("/search/keyword")
    public ResponseEntity<List<JournalEntryResponse>> searchJournalEntriesByKeyword(
            @RequestParam String keyword) {
        logger.info("Received request to search journal entries by keyword: '{}'", keyword);
        try {
            User currentUser = getCurrentUser();
            List<JournalEntry> entries = journalService.searchJournalEntriesByKeyword(currentUser, keyword);
            logger.info("Found {} journal entries matching keyword '{}' for user {}.", entries.size(), keyword, currentUser.getUsername());
            List<JournalEntryResponse> responses = entries.stream()
                    .map(JournalEntryResponse::new)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException e) {
            logger.error("Error during keyword search: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            logger.error("Unexpected error during keyword search: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ⭐ NEW ENDPOINT FOR MOOD SCORE SEARCH ⭐
    /**
     * Searches journal entries for the authenticated user by a mood score range.
     * @param minMood Optional minimum mood score.
     * @param maxMood Optional maximum mood score.
     * @return ResponseEntity with a list of matching JournalEntryResponse objects.
     */
    @GetMapping("/search/mood")
    public ResponseEntity<List<JournalEntryResponse>> searchJournalEntriesByMood(
            @RequestParam(required = false) Double minMood,
            @RequestParam(required = false) Double maxMood) {
        logger.info("Received request to search journal entries by mood range: min={} max={}", minMood, maxMood);
        try {
            User currentUser = getCurrentUser();

            Double actualMinMood = (minMood != null) ? minMood : -1.0;
            Double actualMaxMood = (maxMood != null) ? maxMood : 1.0;

            if (actualMinMood > actualMaxMood) {
                logger.warn("Minimum mood score ({}) cannot be greater than maximum mood score ({}).", actualMinMood, actualMaxMood);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }

            List<JournalEntry> entries = journalService.searchJournalEntriesByMoodScore(currentUser, actualMinMood, actualMaxMood);
            logger.info("Found {} journal entries matching mood range for user {}.", entries.size(), currentUser.getUsername());
            List<JournalEntryResponse> responses = entries.stream()
                    .map(JournalEntryResponse::new)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException e) {
            logger.error("Error during mood search: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            logger.error("Unexpected error during mood search: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
