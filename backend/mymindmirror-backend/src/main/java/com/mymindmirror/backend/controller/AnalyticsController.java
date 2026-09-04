package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.annotation.CurrentUser;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.DailyAggregatedDataResponse;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.util.DateRange;
import com.mymindmirror.backend.util.DateUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final JournalService journalService;

    @GetMapping("/daily-aggregated-data")
    public ResponseEntity<List<DailyAggregatedDataResponse>> getDailyAggregatedData(
            @CurrentUser User currentUser,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("Received request for daily aggregated data for user: {}", currentUser.getUsername());

        DateRange range = DateUtil.parseDateRange(startDate, endDate, 30);
        List<DailyAggregatedDataResponse> data = journalService.getDailyAggregatedDataForUser(
                currentUser, range.start(), range.end()
        );

        log.info("Found {} daily aggregated data points for user {}.", data.size(), currentUser.getUsername());
        return ResponseEntity.ok(data);
    }

    @PostMapping("/anomaly-detection")
    public ResponseEntity<Map<String, Object>> runAnomalyDetection(
            @CurrentUser User currentUser,
            @RequestBody List<DailyAggregatedDataResponse> requestBody) {

        log.info("Received request to run anomaly detection for user: {}", currentUser.getUsername());

        if (requestBody == null || requestBody.isEmpty()) {
            throw new IllegalArgumentException("No data provided for anomaly detection.");
        }

        Map<String, Object> anomalyResults = journalService.runAnomalyDetection(requestBody);

        log.info("Anomaly detection completed for user {}, found {} anomalies.",
                currentUser.getUsername(),
                ((List<?>) anomalyResults.getOrDefault("anomalies", List.of())).size());
        return ResponseEntity.ok(anomalyResults);
    }
}