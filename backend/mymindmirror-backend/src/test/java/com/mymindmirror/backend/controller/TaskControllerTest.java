package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.TaskRequest;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.TaskService;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
@Import(TaskControllerTest.TestSecurityConfig.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TaskService taskService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    private UUID milestoneId;
    private UUID taskId;
    private UUID userId;
    private Task task;
    private TaskRequest taskRequest;

    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable());
            return http.build();
        }
    }
    @BeforeEach
    void setUp() {
        milestoneId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        userId = UUID.randomUUID();

        User mockUser = new User();
        mockUser.setId(userId);
        mockUser.setUsername("testuser");

        task = new Task();
        task.setId(taskId);
        task.setDescription("Test task");
        task.setDueDate(LocalDate.now().plusDays(3));
        task.setStatus(Status.PENDING);

        taskRequest = new TaskRequest();
        taskRequest.setDescription("Test task");
        taskRequest.setDueDate(LocalDate.now().plusDays(3));
        taskRequest.setStatus(Status.PENDING);

        // Mock JWT extraction
        String validToken = "valid.jwt.token";
        when(jwtUtil.extractUserId(validToken)).thenReturn(userId);
        when(userService.findById(userId)).thenReturn(Optional.of(mockUser));
    }

    @Test
    @WithMockUser
    void createTask_ShouldReturnCreated() throws Exception {
        when(taskService.createTask(eq(milestoneId), any(User.class), eq("Test task"), any(LocalDate.class)))
                .thenReturn(task);

        mockMvc.perform(post("/api/milestones/{milestoneId}/tasks", milestoneId)
                        .header("Authorization", "Bearer valid.jwt.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.description").value("Test task"));
    }

    @Test
    @WithMockUser
    void getAllTasks_ShouldReturnOk() throws Exception {
        when(taskService.getAllTasksForMilestone(eq(milestoneId), any(User.class)))
                .thenReturn(List.of(task));

        mockMvc.perform(get("/api/milestones/{milestoneId}/tasks", milestoneId)
                        .header("Authorization", "Bearer valid.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskId.toString()));
    }

    @Test
    @WithMockUser
    void getTaskById_WhenExists_ShouldReturnOk() throws Exception {
        when(taskService.getTaskByIdForMilestoneAndUser(eq(taskId), eq(milestoneId), any(User.class)))
                .thenReturn(Optional.of(task));

        mockMvc.perform(get("/api/milestones/{milestoneId}/tasks/{taskId}", milestoneId, taskId)
                        .header("Authorization", "Bearer valid.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId.toString()));
    }

    @Test
    @WithMockUser
    void getTaskById_WhenNotFound_ShouldReturnBadRequest() throws Exception {
        when(taskService.getTaskByIdForMilestoneAndUser(eq(taskId), eq(milestoneId), any(User.class)))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/milestones/{milestoneId}/tasks/{taskId}", milestoneId, taskId)
                        .header("Authorization", "Bearer valid.jwt.token"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void updateTask_ShouldReturnOk() throws Exception {
        Task updatedTask = new Task();
        updatedTask.setId(taskId);
        updatedTask.setDescription("Updated task");
        updatedTask.setStatus(Status.COMPLETED);

        when(taskService.updateTask(eq(taskId), eq(milestoneId), any(User.class), eq("Updated task"), any(LocalDate.class), eq(Status.COMPLETED)))
                .thenReturn(updatedTask);

        taskRequest.setDescription("Updated task");
        taskRequest.setStatus(Status.COMPLETED);

        mockMvc.perform(put("/api/milestones/{milestoneId}/tasks/{taskId}", milestoneId, taskId)
                        .header("Authorization", "Bearer valid.jwt.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Updated task"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @WithMockUser
    void deleteTask_ShouldReturnOk() throws Exception {
        doNothing().when(taskService).deleteTask(eq(taskId), eq(milestoneId), any(User.class));

        mockMvc.perform(delete("/api/milestones/{milestoneId}/tasks/{taskId}", milestoneId, taskId)
                        .header("Authorization", "Bearer valid.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Task deleted successfully!"));
    }

    @Test
    @WithMockUser
    void createTask_WithoutAuthHeader_ShouldThrowBadRequest() throws Exception {
        mockMvc.perform(post("/api/milestones/{milestoneId}/tasks", milestoneId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isBadRequest()); // IllegalArgumentException → 400
    }

    @Test
    @WithMockUser
    void createTask_WithMalformedAuthHeader_ShouldThrowBadRequest() throws Exception {
        mockMvc.perform(post("/api/milestones/{milestoneId}/tasks", milestoneId)
                        .header("Authorization", "InvalidToken")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createTask_WithValidTokenButUserNotFound_ShouldReturnInternalServerError() throws Exception {
        // Mock extractUserId to return a valid UUID but userService.findById returns empty
        when(jwtUtil.extractUserId("valid.jwt.token")).thenReturn(userId);
        when(userService.findById(userId)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/milestones/{milestoneId}/tasks", milestoneId)
                        .header("Authorization", "Bearer valid.jwt.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isInternalServerError()); // RuntimeException from orElseThrow
    }
}