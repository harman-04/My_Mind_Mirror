package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.TaskRequest;
import com.mymindmirror.backend.payload.response.MessageResponse;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.TaskService;
import com.mymindmirror.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/milestones/{milestoneId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    private User getCurrentUserFromToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Bearer token is missing or malformed.");
        }
        String jwt = authorizationHeader.substring(7);

        UUID userId = jwtUtil.extractUserId(jwt);

        if (userId == null) { // This check is technically redundant if extractUserId throws on null
            throw new IllegalArgumentException("User ID not found in JWT token.");
        }

        return userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("Error: User not found in database for ID: " + userId));
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@RequestHeader("Authorization") String authorizationHeader,
                                           @PathVariable UUID milestoneId,
                                           @RequestBody TaskRequest taskRequest) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        Task newTask = taskService.createTask(
                milestoneId,
                currentUser,
                taskRequest.getDescription(),
                taskRequest.getDueDate(),
                taskRequest.getDetails(),
                taskRequest.getSubtasks()
        );
        return new ResponseEntity<>(newTask, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasksForMilestone(@RequestHeader("Authorization") String authorizationHeader,
                                                              @PathVariable UUID milestoneId) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        List<Task> tasks = taskService.getAllTasksForMilestone(milestoneId, currentUser);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<Task> getTaskById(@RequestHeader("Authorization") String authorizationHeader,
                                            @PathVariable UUID milestoneId, @PathVariable UUID taskId) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        return taskService.getTaskByIdForMilestoneAndUser(taskId, milestoneId, currentUser)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<Task> updateTask(@RequestHeader("Authorization") String authorizationHeader,
                                           @PathVariable UUID milestoneId, @PathVariable UUID taskId,
                                           @RequestBody TaskRequest taskRequest) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        Task updatedTask = taskService.updateTask(
                taskId, milestoneId, currentUser,
                taskRequest.getDescription(),
                taskRequest.getDueDate(),
                taskRequest.getStatus(),
                taskRequest.getDetails(),
                taskRequest.getSubtasks()
        );
        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<MessageResponse> deleteTask(@RequestHeader("Authorization") String authorizationHeader,
                                                      @PathVariable UUID milestoneId, @PathVariable UUID taskId) {
        User currentUser = getCurrentUserFromToken(authorizationHeader);
        taskService.deleteTask(taskId, milestoneId, currentUser);
        return ResponseEntity.ok(new MessageResponse("Task deleted successfully!"));
    }

}
