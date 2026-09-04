package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.DailyAggregatedDataResponse;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class MlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JournalService journalService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashed");
    }

    private void mockAuthenticatedUser() {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    @Test
    @WithMockUser(username = "testuser")
    void getDailyAggregatedData_ShouldReturnData() throws Exception {
        mockAuthenticatedUser();
        LocalDate start = LocalDate.now().minusDays(30);
        LocalDate end = LocalDate.now();
        List<DailyAggregatedDataResponse> mockData = List.of(
                new DailyAggregatedDataResponse(LocalDate.now(), 0.5, 150L),
                new DailyAggregatedDataResponse(LocalDate.now().minusDays(1), 0.2, 200L)
        );
        when(journalService.getDailyAggregatedDataForUser(eq(testUser), eq(start), eq(end)))
                .thenReturn(mockData);

        mockMvc.perform(get("/api/ml/daily-aggregated-data"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].averageMood").value(0.5));
    }

    @Test
    @WithMockUser(username = "testuser")
    void getDailyAggregatedData_WithCustomDates_ShouldReturnFilteredData() throws Exception {
        mockAuthenticatedUser();
        String startDate = "2025-01-01";
        String endDate = "2025-01-31";
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        List<DailyAggregatedDataResponse> mockData = List.of(
                new DailyAggregatedDataResponse(LocalDate.parse("2025-01-15"), 0.7, 300L)
        );
        when(journalService.getDailyAggregatedDataForUser(eq(testUser), eq(start), eq(end)))
                .thenReturn(mockData);

        mockMvc.perform(get("/api/ml/daily-aggregated-data")
                        .param("startDate", startDate)
                        .param("endDate", endDate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].date").value("2025-01-15"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void getDailyAggregatedData_InvalidDateFormat_ShouldReturnBadRequest() throws Exception {
        mockAuthenticatedUser();
        mockMvc.perform(get("/api/ml/daily-aggregated-data")
                        .param("startDate", "invalid-date"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "testuser")
    void runAnomalyDetection_ShouldReturnResults() throws Exception {
        mockAuthenticatedUser();
        List<DailyAggregatedDataResponse> requestBody = List.of(
                new DailyAggregatedDataResponse(LocalDate.now(), 0.5, 150L),
                new DailyAggregatedDataResponse(LocalDate.now().minusDays(1), 0.2, 200L)
        );
        Map<String, Object> mockResponse = Map.of("anomalies", List.of(), "message", "No anomalies detected");
        when(journalService.runAnomalyDetection(anyList())).thenReturn(mockResponse);

        mockMvc.perform(post("/api/ml/anomaly-detection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("No anomalies detected"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void runAnomalyDetection_EmptyRequestBody_ShouldReturnBadRequest() throws Exception {
        mockAuthenticatedUser();
        mockMvc.perform(post("/api/ml/anomaly-detection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("No data provided for anomaly detection."));
    }

    @Test
    @WithMockUser(username = "testuser")
    void runAnomalyDetection_ServiceThrowsException_ShouldReturnInternalServerError() throws Exception {
        mockAuthenticatedUser();
        List<DailyAggregatedDataResponse> requestBody = List.of(
                new DailyAggregatedDataResponse(LocalDate.now(), 0.5, 150L)
        );
        when(journalService.runAnomalyDetection(anyList())).thenThrow(new RuntimeException("ML service error"));

        mockMvc.perform(post("/api/ml/anomaly-detection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to run anomaly detection."));
    }

    @Test
    void getDailyAggregatedData_Unauthenticated_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/ml/daily-aggregated-data"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void runAnomalyDetection_Unauthenticated_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(post("/api/ml/anomaly-detection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "nonexistent")
    void getDailyAggregatedData_WhenUserNotFound_ShouldThrowRuntimeException() throws Exception {
        // Simulate user not found in DB
        when(userService.findByUsername("nonexistent")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/ml/daily-aggregated-data"))
                .andExpect(status().isInternalServerError()); // The global exception handler will return 500
        // The lambda inside orElseThrow will be executed, but the exception is caught by the controller's exception handler?
        // Actually the controller method calls getCurrentUser() which throws RuntimeException, which propagates to the global exception handler.
        // The test will result in 500 Internal Server Error.
    }

    @Test
    @WithMockUser(username = "ghostuser")
    void getDailyAggregatedData_WhenAuthenticatedUserNotFound_ShouldReturnInternalServerError() throws Exception {
        when(userService.findByUsername("ghostuser")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/ml/daily-aggregated-data"))
                .andExpect(status().isInternalServerError());
    }
}