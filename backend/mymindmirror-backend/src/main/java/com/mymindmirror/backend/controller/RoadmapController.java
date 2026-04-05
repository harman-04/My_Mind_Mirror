package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.Roadmap;
import com.mymindmirror.backend.model.RoadmapTask;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ImportTaskRequest;
import com.mymindmirror.backend.payload.request.RoadmapGenerateRequest;
import com.mymindmirror.backend.payload.response.RoadmapResponse;
import com.mymindmirror.backend.service.RoadmapService;
import com.mymindmirror.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/roadmap")
@RequiredArgsConstructor
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final UserService userService;
    private final ObjectMapper objectMapper;


//    public RoadmapController(RoadmapService roadmapService, UserService userService) {
//        this.roadmapService = roadmapService;
//        this.userService = userService;
//    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateRoadmap(@AuthenticationPrincipal UserDetails userDetails,
                                             @RequestBody RoadmapGenerateRequest request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            Roadmap roadmap = roadmapService.generateRoadmap(userOpt.get(), request.getGoal(), request.getTimeframeWeeks());
            // Convert entity to DTO before returning
            RoadmapResponse response = roadmapService.toResponse(roadmap);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to generate roadmap: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<RoadmapResponse>> getUserRoadmaps(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(roadmapService.getUserRoadmaps(userOpt.get()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoadmap(@AuthenticationPrincipal UserDetails userDetails,
                                           @PathVariable UUID id) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            roadmapService.deleteRoadmap(id, userOpt.get());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to delete roadmap: " + e.getMessage());
        }
    }

    @PostMapping("/import-task")
    public ResponseEntity<?> importTaskToMilestone(@AuthenticationPrincipal UserDetails userDetails,
                                                   @RequestBody ImportTaskRequest request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            roadmapService.importTaskToMilestone(request.getRoadmapId(), request.getTaskId(), userOpt.get());
            return ResponseEntity.ok().body("Task imported successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to import task: " + e.getMessage());
        }
    }

    @PatchMapping("/task/{taskId}/toggle")
    public ResponseEntity<?> toggleTaskCompletion(@AuthenticationPrincipal UserDetails userDetails,
                                                  @PathVariable UUID taskId) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            roadmapService.toggleTaskCompletion(taskId, userOpt.get());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to toggle task: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/continue")
    public ResponseEntity<?> continueRoadmap(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable UUID id) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            RoadmapResponse response = roadmapService.continueRoadmap(id, userOpt.get());
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to continue roadmap: " + e.getMessage());
        }
    }

    @PostMapping("/task/{taskId}/elaborate")
    public ResponseEntity<?> elaborateTask(@AuthenticationPrincipal UserDetails userDetails,
                                           @PathVariable UUID taskId,
                                           @RequestParam(defaultValue = "false") boolean enhance) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            RoadmapTask elaborated = roadmapService.elaborateTask(taskId, userOpt.get(), enhance);
            Map<String, Object> response = Map.of(
                    "id", elaborated.getId(),
                    "details", elaborated.getDetails(),
                    "subtasks", elaborated.getSubtasks() != null ?
                            objectMapper.readValue(elaborated.getSubtasks(), List.class) : List.of()
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to elaborate task: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/reschedule")
    public ResponseEntity<?> rescheduleRoadmap(@AuthenticationPrincipal UserDetails userDetails,
                                               @PathVariable UUID id) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        try {
            RoadmapResponse response = roadmapService.rescheduleRoadmap(id, userOpt.get());
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to reschedule: " + e.getMessage());
        }
    }
}