package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.InsightStatus;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.MilestoneRequest;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.security.services.UserDetailsImpl;
import com.mymindmirror.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.test.context.support.WithUserDetails;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MilestoneController.class)
@Import(MilestoneControllerTest.TestSecurityConfig.class)
class MilestoneControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MilestoneService milestoneService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private TaskService taskService;

    @MockitoBean
    private ApiKeyService apiKeyService;

    @MockitoBean
    private MilestoneInsightService milestoneInsightService;

    @MockitoBean
    private JwtUtil jwtUtil;

    private User testUser;
    private Milestone testMilestone;
    private UUID userId;
    private UUID milestoneId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        milestoneId = UUID.randomUUID();

        testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");

        testMilestone = new Milestone();
        testMilestone.setId(milestoneId);
        testMilestone.setTitle("Test Milestone");
        testMilestone.setDescription("Test Description");
        testMilestone.setDueDate(LocalDate.now().plusDays(7));
        testMilestone.setStatus(Status.PENDING);
        testMilestone.setUser(testUser);
    }

    // Test security configuration: disables CSRF and uses our custom UserDetailsService
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }

        @Bean
        public UserDetailsService userDetailsService() {
            return username -> {
                if ("testuser".equals(username)) {
                    User user = new User();
                    user.setId(UUID.randomUUID());
                    user.setUsername("testuser");
                    user.setPasswordHash("dummy");
                    return UserDetailsImpl.build(user);
                }
                throw new UsernameNotFoundException("User not found: " + username);
            };
        }
    }

    @Test
    @WithUserDetails("testuser")
    void createMilestone_ShouldReturnCreated() throws Exception {
        MilestoneRequest request = new MilestoneRequest();
        request.setTitle("New Milestone");
        request.setDescription("New Description");
        request.setDueDate(LocalDate.now().plusDays(14));
        request.setStatus(Status.PENDING);

        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.createMilestone(any(User.class), anyString(), anyString(), any(LocalDate.class)))
                .thenReturn(testMilestone);

        mockMvc.perform(post("/api/milestones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(milestoneId.toString()))
                .andExpect(jsonPath("$.title").value("Test Milestone"));
    }

    @Test
    @WithUserDetails("testuser")
    void createMilestone_UserNotFound_ShouldReturnUnauthorized() throws Exception {
        MilestoneRequest request = new MilestoneRequest();
        request.setTitle("New Milestone");

        when(userService.findById(any(UUID.class))).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/milestones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("User not found"));
    }

    @Test
    @WithUserDetails("testuser")
    void getAllMilestones_ShouldReturnOk() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.getAllMilestonesForUser(testUser)).thenReturn(List.of(testMilestone));

        mockMvc.perform(get("/api/milestones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(milestoneId.toString()))
                .andExpect(jsonPath("$[0].title").value("Test Milestone"));
    }

    @Test
    @WithUserDetails("testuser")
    void getAllMilestones_UserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/milestones"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("User not found"));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneById_ShouldReturnOk() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser)).thenReturn(Optional.of(testMilestone));

        mockMvc.perform(get("/api/milestones/{id}", milestoneId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(milestoneId.toString()))
                .andExpect(jsonPath("$.title").value("Test Milestone"));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneById_NotFound_ShouldReturnNotFound() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/milestones/{id}", milestoneId))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Milestone not found or not owned"));
    }

    @Test
    @WithUserDetails("testuser")
    void updateMilestone_ShouldReturnOk() throws Exception {
        MilestoneRequest request = new MilestoneRequest();
        request.setTitle("Updated Title");
        request.setDescription("Updated Description");
        request.setDueDate(LocalDate.now().plusDays(21));
        request.setStatus(Status.IN_PROGRESS);

        Milestone updatedMilestone = new Milestone();
        updatedMilestone.setId(milestoneId);
        updatedMilestone.setTitle("Updated Title");
        updatedMilestone.setDescription("Updated Description");
        updatedMilestone.setDueDate(request.getDueDate());
        updatedMilestone.setStatus(Status.IN_PROGRESS);
        updatedMilestone.setUser(testUser);

        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.updateMilestone(eq(milestoneId), eq(testUser), anyString(), anyString(), any(LocalDate.class), any(Status.class)))
                .thenReturn(updatedMilestone);

        mockMvc.perform(put("/api/milestones/{id}", milestoneId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @WithUserDetails("testuser")
    void updateMilestone_NotFound_ShouldReturnNotFound() throws Exception {
        MilestoneRequest request = new MilestoneRequest();
        request.setTitle("Updated Title");

        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.updateMilestone(any(), any(), any(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Milestone not found"));

        mockMvc.perform(put("/api/milestones/{id}", milestoneId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Milestone not found"));
    }

    @Test
    @WithUserDetails("testuser")
    void deleteMilestone_ShouldReturnOk() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        doNothing().when(milestoneService).deleteMilestone(milestoneId, testUser);

        mockMvc.perform(delete("/api/milestones/{id}", milestoneId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Milestone deleted successfully!"));
    }

    @Test
    @WithUserDetails("testuser")
    void deleteMilestone_NotFound_ShouldReturnNotFound() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        doThrow(new IllegalArgumentException("Milestone not found")).when(milestoneService).deleteMilestone(milestoneId, testUser);

        mockMvc.perform(delete("/api/milestones/{id}", milestoneId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Milestone not found"));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneInsights_ShouldReturnOk() throws Exception {
        MilestoneInsightResponse insights = new MilestoneInsightResponse(
                "Remaining work",
                "Good performance",
                List.of("Tip 1", "Tip 2"),
                "Encouragement",
                List.of("New task"),
                InsightStatus.SUCCESS
        );

        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser)).thenReturn(Optional.of(testMilestone));
        when(milestoneInsightService.getMilestoneInsights(testMilestone)).thenReturn(Mono.just(insights));

        mockMvc.perform(get("/api/milestones/{id}/insights", milestoneId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performanceAssessment").value("Good performance"))
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneInsights_MilestoneNotFound_ShouldReturnNotFound() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/milestones/{id}/insights", milestoneId))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Milestone not found or not owned."));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneInsights_ServiceError_ShouldReturnInternalServerError() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser)).thenReturn(Optional.of(testMilestone));
        when(milestoneInsightService.getMilestoneInsights(testMilestone)).thenThrow(new RuntimeException("ML service error"));

        mockMvc.perform(get("/api/milestones/{id}/insights", milestoneId))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Failed to generate milestone insights."));
    }

    @Test
    @WithUserDetails("testuser")
    void deleteMilestone_UserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/milestones/{id}", milestoneId))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("User not found"));
    }

    @Test
    @WithUserDetails("testuser")
    void deleteMilestone_GenericException_ShouldReturnInternalServerError() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        doThrow(new RuntimeException("Database error")).when(milestoneService).deleteMilestone(milestoneId, testUser);

        mockMvc.perform(delete("/api/milestones/{id}", milestoneId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Internal Server Error"));
    }

    @Test
    @WithUserDetails("testuser")
    void updateMilestone_GenericException_ShouldReturnInternalServerError() throws Exception {
        MilestoneRequest request = new MilestoneRequest();
        request.setTitle("Updated Title");

        when(userService.findById(any(UUID.class))).thenReturn(Optional.of(testUser));
        when(milestoneService.updateMilestone(any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(put("/api/milestones/{id}", milestoneId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Internal Server Error"));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneById_UserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/milestones/{id}", milestoneId))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("User not found"));
    }

    @Test
    @WithUserDetails("testuser")
    void getMilestoneInsights_UserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findById(any(UUID.class))).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/milestones/{id}/insights", milestoneId))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("User not found"));
    }
}