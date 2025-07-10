package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.JournalEntryRequest;
import com.mymindmirror.backend.payload.JournalEntryResponse;
import com.mymindmirror.backend.payload.MoodDataResponse;
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
import java.util.List;
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
        } catch (Exception e) {
            logger.error("Error saving journal entry: {}", e.getMessage(), e);
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
            // Return 404 Not Found if entry doesn't exist, or 403 Forbidden if not owned
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null); // Or more specific status based on e.getMessage()
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
            // Return 404 Not Found if entry doesn't exist, or 403 Forbidden if not owned
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
            return ResponseEntity.badRequest().body(null);
        }

        // Use the new method that orders by creation timestamp
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
            return ResponseEntity.badRequest().body(null);
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
}
