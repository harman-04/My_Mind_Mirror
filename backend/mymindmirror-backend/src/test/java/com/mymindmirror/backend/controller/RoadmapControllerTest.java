package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.Roadmap;
import com.mymindmirror.backend.model.RoadmapTask;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ImportTaskRequest;
import com.mymindmirror.backend.payload.request.RoadmapGenerateRequest;
import com.mymindmirror.backend.payload.response.RoadmapResponse;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.RoadmapService;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RoadmapController.class)
@WithMockUser(username = "testuser")
@AutoConfigureMockMvc(addFilters = false)

class RoadmapControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private RoadmapService roadmapService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    private User testUser;
    private Roadmap testRoadmap;
    private RoadmapResponse testResponse;
    private RoadmapTask testTask;
    private UUID roadmapId;
    private UUID taskId;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");

        roadmapId = UUID.randomUUID();
        taskId = UUID.randomUUID();

        testRoadmap = new Roadmap();
        testRoadmap.setId(roadmapId);
        testRoadmap.setTitle("Test Roadmap");
        testRoadmap.setDescription("Learn testing");
        testRoadmap.setDurationWeeks(4);
        testRoadmap.setStatus("ACTIVE");
        testRoadmap.setCreatedAt(LocalDate.now());

        testResponse = new RoadmapResponse();
        testResponse.setId(roadmapId);
        testResponse.setTitle("Test Roadmap");
        testResponse.setDescription("Learn testing");
        testResponse.setDurationWeeks(4);
        testResponse.setStatus("ACTIVE");
        testResponse.setCreatedAt(LocalDate.now());

        testTask = new RoadmapTask();
        testTask.setId(taskId);
        testTask.setDescription("Write test");
        testTask.setCompleted(false);
    }

    @Test
    void generateRoadmap_ShouldReturnOk_WhenUserExists() throws Exception {
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal("Learn testing");
        request.setTimeframeWeeks(4);

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.generateRoadmap(any(User.class), eq("Learn testing"), eq(4)))
                .thenReturn(testRoadmap);
        when(roadmapService.toResponse(any(Roadmap.class))).thenReturn(testResponse);

        mockMvc.perform(post("/api/roadmap/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roadmapId.toString()))
                .andExpect(jsonPath("$.title").value("Test Roadmap"));
    }

    @Test
    void generateRoadmap_ShouldReturnUnauthorized_WhenUserNotFound() throws Exception {
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal("Learn testing");

        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/roadmap/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getUserRoadmaps_ShouldReturnOk_WhenUserExists() throws Exception {
        List<RoadmapResponse> roadmaps = List.of(testResponse);
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.getUserRoadmaps(testUser)).thenReturn(roadmaps);

        mockMvc.perform(get("/api/roadmap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(roadmapId.toString()));
    }

    @Test
    void getUserRoadmaps_ShouldReturnUnauthorized_WhenUserNotFound() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/roadmap"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteRoadmap_ShouldReturnOk_WhenSuccessful() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doNothing().when(roadmapService).deleteRoadmap(roadmapId, testUser);

        mockMvc.perform(delete("/api/roadmap/{id}", roadmapId))
                .andExpect(status().isOk());
    }

    @Test
    void deleteRoadmap_ShouldReturnUnauthorized_WhenUserNotFound() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());
        mockMvc.perform(delete("/api/roadmap/{id}", roadmapId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void importTaskToMilestone_ShouldReturnOk_WhenSuccessful() throws Exception {
        ImportTaskRequest request = new ImportTaskRequest();
        request.setRoadmapId(roadmapId);
        request.setTaskId(taskId);

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doNothing().when(roadmapService).importTaskToMilestone(roadmapId, taskId, testUser);

        mockMvc.perform(post("/api/roadmap/import-task")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Task imported successfully"));
    }

    @Test
    void toggleTaskCompletion_ShouldReturnOk_WhenSuccessful() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doNothing().when(roadmapService).toggleTaskCompletion(taskId, testUser);

        mockMvc.perform(patch("/api/roadmap/task/{taskId}/toggle", taskId))
                .andExpect(status().isOk());
    }

    @Test
    void continueRoadmap_ShouldReturnOk_WhenSuccessful() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.continueRoadmap(roadmapId, testUser)).thenReturn(testResponse);

        mockMvc.perform(post("/api/roadmap/{id}/continue", roadmapId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roadmapId.toString()));
    }

    @Test
    void continueRoadmap_ShouldReturnBadRequest_WhenNoCompletedTasks() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.continueRoadmap(roadmapId, testUser))
                .thenThrow(new IllegalStateException("No completed tasks yet"));

        mockMvc.perform(post("/api/roadmap/{id}/continue", roadmapId))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("No completed tasks yet"));
    }

    @Test
    void elaborateTask_ShouldReturnOk_WhenSuccessful() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        testTask.setDetails("Detailed instructions");
        testTask.setSubtasks("[\"sub1\",\"sub2\"]");
        when(roadmapService.elaborateTask(taskId, testUser, false)).thenReturn(testTask);

        mockMvc.perform(post("/api/roadmap/task/{taskId}/elaborate", taskId)
                        .param("enhance", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.details").value("Detailed instructions"))
                .andExpect(jsonPath("$.subtasks[0]").value("sub1"));
    }

    @Test
    void rescheduleRoadmap_ShouldReturnOk_WhenSuccessful() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.rescheduleRoadmap(roadmapId, testUser)).thenReturn(testResponse);

        mockMvc.perform(post("/api/roadmap/{id}/reschedule", roadmapId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roadmapId.toString()));
    }

    @Test
    void rescheduleRoadmap_ShouldReturnBadRequest_WhenAllTasksCompleted() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.rescheduleRoadmap(roadmapId, testUser))
                .thenThrow(new IllegalStateException("All tasks are already completed"));

        mockMvc.perform(post("/api/roadmap/{id}/reschedule", roadmapId))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("All tasks are already completed"));
    }

    // ========== Exception branch tests ==========

    @Test
    void generateRoadmap_ShouldReturnInternalServerError_WhenServiceThrowsException() throws Exception {
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal("Learn testing");
        request.setTimeframeWeeks(4);

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.generateRoadmap(any(User.class), eq("Learn testing"), eq(4)))
                .thenThrow(new RuntimeException("Service error"));

        mockMvc.perform(post("/api/roadmap/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to generate roadmap: Service error"));
    }

    @Test
    void deleteRoadmap_ShouldReturnInternalServerError_WhenServiceThrowsException() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doThrow(new RuntimeException("Service error")).when(roadmapService).deleteRoadmap(roadmapId, testUser);

        mockMvc.perform(delete("/api/roadmap/{id}", roadmapId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to delete roadmap: Service error"));
    }

    @Test
    void importTaskToMilestone_ShouldReturnInternalServerError_WhenServiceThrowsException() throws Exception {
        ImportTaskRequest request = new ImportTaskRequest();
        request.setRoadmapId(roadmapId);
        request.setTaskId(taskId);

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doThrow(new RuntimeException("Service error")).when(roadmapService)
                .importTaskToMilestone(roadmapId, taskId, testUser);

        mockMvc.perform(post("/api/roadmap/import-task")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to import roadmap: Service error"));
    }

    @Test
    void toggleTaskCompletion_ShouldReturnInternalServerError_WhenServiceThrowsException() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doThrow(new RuntimeException("Service error")).when(roadmapService).toggleTaskCompletion(taskId, testUser);

        mockMvc.perform(patch("/api/roadmap/task/{taskId}/toggle", taskId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to toggle roadmap: Service error"));
    }

    @Test
    void continueRoadmap_ShouldReturnInternalServerError_WhenServiceThrowsGenericException() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.continueRoadmap(roadmapId, testUser))
                .thenThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(post("/api/roadmap/{id}/continue", roadmapId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to continue roadmap: Unexpected error"));
    }

    @Test
    void rescheduleRoadmap_ShouldReturnInternalServerError_WhenServiceThrowsGenericException() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.rescheduleRoadmap(roadmapId, testUser))
                .thenThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(post("/api/roadmap/{id}/reschedule", roadmapId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to reschedule roadmap: Unexpected error"));
    }

    @Test
    void elaborateTask_ShouldReturnInternalServerError_WhenServiceThrowsException() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(roadmapService.elaborateTask(taskId, testUser, false))
                .thenThrow(new RuntimeException("Service error"));

        mockMvc.perform(post("/api/roadmap/task/{taskId}/elaborate", taskId)
                        .param("enhance", "false"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to elaborated roadmap: Service error"));
    }

    // ========== Enhance branch test ==========
    @Test
    void elaborateTask_ShouldReturnOk_WhenEnhanceTrue() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        testTask.setDetails("Enhanced details");
        testTask.setSubtasks("[\"sub1\",\"sub2\"]");
        when(roadmapService.elaborateTask(taskId, testUser, true)).thenReturn(testTask);

        mockMvc.perform(post("/api/roadmap/task/{taskId}/elaborate", taskId)
                        .param("enhance", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.details").value("Enhanced details"));
    }
}