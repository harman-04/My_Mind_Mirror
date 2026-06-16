package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.UserStatsResponse;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.GamificationService;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.hasItems;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GamificationController.class)
class GamificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GamificationService gamificationService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @Test
    @WithMockUser(username = "testuser")
    void getUserStats_WhenUserExists_ShouldReturnStats() throws Exception {
        // Arrange
        User mockUser = new User();
        mockUser.setId(java.util.UUID.randomUUID());
        mockUser.setUsername("testuser");

        UserStatsResponse mockStats = new UserStatsResponse(
                5, 10, LocalDate.now(),
                Set.of("FIRST_STEP", "THREE_DAY_STREAK"),
                15
        );

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(gamificationService.getUserStats(mockUser)).thenReturn(mockStats);

        // Act & Assert
        mockMvc.perform(get("/api/gamification/stats")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStreak").value(5))
                .andExpect(jsonPath("$.longestStreak").value(10))
                .andExpect(jsonPath("$.badges").isArray())
                .andExpect(jsonPath("$.badges.length()").value(2))
                .andExpect(jsonPath("$.badges", hasItems("FIRST_STEP", "THREE_DAY_STREAK")))
                .andExpect(jsonPath("$.totalTasksCompleted").value(15));
    }
    @Test
    @WithMockUser(username = "unknown")
    void getUserStats_WhenUserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findByUsername("unknown")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/gamification/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "testuser")   // Fixed: specify username to match the mock
    void getUserStats_WhenServiceThrowsException_ShouldReturn500() throws Exception {
        User mockUser = new User();
        mockUser.setId(java.util.UUID.randomUUID());
        mockUser.setUsername("testuser");

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(gamificationService.getUserStats(any(User.class))).thenThrow(new RuntimeException("Service error"));

        mockMvc.perform(get("/api/gamification/stats"))
                .andExpect(status().isInternalServerError());
    }
}