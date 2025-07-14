// src/main/java/com/mymindmirror.backend/controller/TaskController.java
package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.MessageResponse;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.TaskService;
import com.mymindmirror.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize; // ⭐ REMOVE THIS IMPORT ⭐
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/milestones/{milestoneId}/tasks")
public class TaskController {

    private static final Logger logger = LoggerFactory.getLogger(TaskController.class);

    private final TaskService taskService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public TaskController(TaskService taskService, UserService userService, JwtUtil jwtUtil) {
        this.taskService = taskService;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    private User getCurrentUserFromToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Bearer token is missing or malformed.");
        }
        String jwt = authorizationHeader.substring(7);
        String userIdString = jwtUtil.extractUserId(jwt);
        if (userIdString == null) {
            throw new IllegalArgumentException("User ID not found in JWT token.");
        }
        UUID userId = UUID.fromString(userIdString);
        return userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("Error: User not found in database for ID: " + userId));
    }

    @PostMapping
    // @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')") // ⭐ REMOVE THIS LINE ⭐
    public ResponseEntity<Task> createTask(@RequestHeader("Authorization") String authorizationHeader,
                                           @PathVariable UUID milestoneId, @RequestBody TaskRequest taskRequest) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        Task newTask = taskService.createTask(
                milestoneId,
                currentUser,
                taskRequest.getDescription(),
                taskRequest.getDueDate()
        );
        return new ResponseEntity<>(newTask, HttpStatus.CREATED);
    }

    @GetMapping
    // @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')") // ⭐ REMOVE THIS LINE ⭐
    public ResponseEntity<List<Task>> getAllTasksForMilestone(@RequestHeader("Authorization") String authorizationHeader,
                                                              @PathVariable UUID milestoneId) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        List<Task> tasks = taskService.getAllTasksForMilestone(milestoneId, currentUser);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{taskId}")
    // @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')") // ⭐ REMOVE THIS LINE ⭐
    public ResponseEntity<Task> getTaskById(@RequestHeader("Authorization") String authorizationHeader,
                                            @PathVariable UUID milestoneId, @PathVariable UUID taskId) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        return taskService.getTaskByIdForMilestoneAndUser(taskId, milestoneId, currentUser)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));
    }

    @PutMapping("/{taskId}")
    // @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')") // ⭐ REMOVE THIS LINE ⭐
    public ResponseEntity<Task> updateTask(@RequestHeader("Authorization") String authorizationHeader,
                                           @PathVariable UUID milestoneId, @PathVariable UUID taskId, @RequestBody TaskRequest taskRequest) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        Task updatedTask = taskService.updateTask(
                taskId,
                milestoneId,
                currentUser,
                taskRequest.getDescription(),
                taskRequest.getDueDate(),
                taskRequest.getStatus()
        );
        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{taskId}")
    // @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')") // ⭐ REMOVE THIS LINE ⭐
    public ResponseEntity<MessageResponse> deleteTask(@RequestHeader("Authorization") String authorizationHeader,
                                                      @PathVariable UUID milestoneId, @PathVariable UUID taskId) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        taskService.deleteTask(taskId, milestoneId, currentUser);
        return ResponseEntity.ok(new MessageResponse("Task deleted successfully!"));
    }

    public static class TaskRequest {
        private String description;
        private LocalDate dueDate;
        private Task.Status status;

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
        public Task.Status getStatus() { return status; }
        public void setStatus(Task.Status status) { this.status = status; }
    }
}