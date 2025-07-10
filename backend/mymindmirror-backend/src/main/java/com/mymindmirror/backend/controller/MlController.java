package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.payload.DailyAggregatedDataResponse;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.model.User;
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
import java.util.Map;

/**
 * REST Controller for machine learning related services.
 * Acts as a proxy/gateway for the Flask ML service.
 */
@RestController
@RequestMapping("/api/ml")
public class MlController {

    private static final Logger logger = LoggerFactory.getLogger(MlController.class);

    private final JournalService journalService;
    private final UserService userService;

    public MlController(JournalService journalService, UserService userService) {
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

    // This endpoint is for fetching aggregated data from Spring Boot's database
    // which is then sent to Flask for anomaly detection.
    @GetMapping("/daily-aggregated-data")
    public ResponseEntity<List<DailyAggregatedDataResponse>> getDailyAggregatedData(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        logger.info("Received request for daily aggregated data.");
        User currentUser = getCurrentUser(); // Ensure user is authenticated

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
            logger.error("Invalid date format provided for daily aggregated data: {}. Using default date range.", e.getMessage());
            return ResponseEntity.badRequest().body(null);
        }

        List<DailyAggregatedDataResponse> data = journalService.getDailyAggregatedDataForUser(currentUser, start, end);
        logger.info("Found {} daily aggregated data points for user {} in range {} to {}.", data.size(), currentUser.getUsername(), start, end);
        return ResponseEntity.ok(data);
    }

    // This endpoint triggers anomaly detection in the Flask ML service.
    // It receives the aggregated data from the frontend (via Spring Boot's getDailyAggregatedData endpoint)
    // and forwards it to Flask.
    @PostMapping("/anomaly-detection")
    public ResponseEntity<Map<String, Object>> runAnomalyDetection(@RequestBody List<DailyAggregatedDataResponse> requestBody) {
        // Authenticate user
        getCurrentUser();

        if (requestBody == null || requestBody.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No data provided for anomaly detection."));
        }

        try {
            logger.info("Received request to run anomaly detection with {} data points.", requestBody.size());
            Map<String, Object> anomalyResults = journalService.runAnomalyDetection(requestBody);
            return ResponseEntity.ok(anomalyResults);
        } catch (Exception e) {
            logger.error("Error running anomaly detection: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to run anomaly detection."));
        }
    }
}
