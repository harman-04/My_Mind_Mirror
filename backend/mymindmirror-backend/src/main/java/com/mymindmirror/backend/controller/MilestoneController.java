package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.MilestoneRequest;
import com.mymindmirror.backend.payload.response.MessageResponse;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import com.mymindmirror.backend.payload.response.MilestoneResponse;
import com.mymindmirror.backend.security.services.UserDetailsImpl;
import com.mymindmirror.backend.service.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/milestones")
@RequiredArgsConstructor
@Slf4j
public class MilestoneController {

    private final MilestoneService milestoneService;
    private final UserService userService;
    private final MilestoneInsightService milestoneInsightService;
    private final TaskService taskService;
    private final ApiKeyService apiKeyService;


    @PostMapping
    public ResponseEntity<?> createMilestone(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                             @RequestBody MilestoneRequest milestoneRequest) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        MilestoneResponse response = milestoneService.createMilestoneAsDTO(
                userOpt.get(),
                milestoneRequest.getTitle(),
                milestoneRequest.getDescription(),
                milestoneRequest.getDueDate()
        );
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }


    @GetMapping
    public ResponseEntity<?> getAllMilestones(@AuthenticationPrincipal UserDetailsImpl authenticatedUser) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        List<MilestoneResponse> milestones = milestoneService.getAllMilestonesForUserAsDTO(userOpt.get());
        return ResponseEntity.ok(milestones);
    }


//    @GetMapping("/{id}")
//    public ResponseEntity<?> getMilestoneById(
//            @AuthenticationPrincipal UserDetailsImpl authenticatedUser,
//            @PathVariable UUID id) {
//
//        UUID currentUserId = authenticatedUser.getId();
//        Optional<User> userOpt = userService.findById(currentUserId);
//
//        if (userOpt.isEmpty()) {
//            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
//        }
//
//        Optional<Milestone> milestoneOpt = milestoneService.getMilestoneByIdForUser(id, userOpt.get());
//
//        return milestoneOpt
//                .<ResponseEntity<?>>map(ResponseEntity::ok)
//                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Milestone not found or not owned"));
//    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMilestoneById(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                              @PathVariable UUID id) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        try {
            MilestoneResponse response = milestoneService.getMilestoneResponseById(id, userOpt.get());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMilestone(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                             @PathVariable UUID id,
                                             @RequestBody MilestoneRequest milestoneRequest) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        try {
            MilestoneResponse response = milestoneService.updateMilestoneAsDTO(
                    id, userOpt.get(),
                    milestoneRequest.getTitle(),
                    milestoneRequest.getDescription(),
                    milestoneRequest.getDueDate(),
                    milestoneRequest.getStatus()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error updating milestone", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal Server Error");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMilestone(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                             @PathVariable UUID id) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        try {
            milestoneService.deleteMilestone(id, userOpt.get());
            return ResponseEntity.ok(new MessageResponse("Milestone deleted successfully!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting milestone: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new MessageResponse("Internal Server Error"));
        }
    }

    @GetMapping("/{id}/insights")
    public ResponseEntity<?> getMilestoneInsights(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                                  @PathVariable UUID id) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        Optional<Milestone> milestoneOpt = milestoneService.getMilestoneByIdForUser(id, userOpt.get());
        if (milestoneOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Milestone not found or not owned.");
        }

        try {
            MilestoneInsightResponse insights = milestoneInsightService.getMilestoneInsights(milestoneOpt.get()).block();
            return ResponseEntity.ok(insights);
        } catch (Exception e) {
            log.error("Error fetching insights: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to generate milestone insights.");
        }
    }


    @PostMapping("/import-growth-tip")
    public ResponseEntity<?> importGrowthTip(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                             @RequestBody Map<String, String> request) {
        String tipText = request.get("tipText");
        if (tipText == null || tipText.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Tip text is required");
        }
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        User user = userOpt.get();

        List<Task> tasks = milestoneService.importGrowthTipAsTask(user, tipText);

        return ResponseEntity.ok(Map.of("message", tasks.size() + " tasks added to Milestones"));
    }


}
