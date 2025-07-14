package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.MessageResponse;
import com.mymindmirror.backend.payload.response.MilestoneInsightResponse;
import com.mymindmirror.backend.security.services.UserDetailsImpl;
import com.mymindmirror.backend.service.MilestoneInsightService;
import com.mymindmirror.backend.service.MilestoneService;
import com.mymindmirror.backend.service.UserService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/milestones")
public class MilestoneController {

    private static final Logger logger = LoggerFactory.getLogger(MilestoneController.class);

    private final MilestoneService milestoneService;
    private final UserService userService;
    private final MilestoneInsightService milestoneInsightService;

    public MilestoneController(MilestoneService milestoneService, UserService userService,
                               MilestoneInsightService milestoneInsightService) {
        this.milestoneService = milestoneService;
        this.userService = userService;
        this.milestoneInsightService = milestoneInsightService;
    }

    @PostMapping
    public ResponseEntity<?> createMilestone(@AuthenticationPrincipal UserDetailsImpl authenticatedUser,
                                             @RequestBody MilestoneRequest milestoneRequest) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        Milestone milestone = milestoneService.createMilestone(
                userOpt.get(),
                milestoneRequest.getTitle(),
                milestoneRequest.getDescription(),
                milestoneRequest.getDueDate()
        );
        return new ResponseEntity<>(milestone, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<?> getAllMilestones(@AuthenticationPrincipal UserDetailsImpl authenticatedUser) {
        UUID userId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        List<Milestone> milestones = milestoneService.getAllMilestonesForUser(userOpt.get());
        return ResponseEntity.ok(milestones);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMilestoneById(
            @AuthenticationPrincipal UserDetailsImpl authenticatedUser,
            @PathVariable UUID id) {

        UUID currentUserId = authenticatedUser.getId();
        Optional<User> userOpt = userService.findById(currentUserId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        Optional<Milestone> milestoneOpt = milestoneService.getMilestoneByIdForUser(id, userOpt.get());

        return milestoneOpt
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Milestone not found or not owned"));
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
            Milestone updated = milestoneService.updateMilestone(
                    id, userOpt.get(),
                    milestoneRequest.getTitle(),
                    milestoneRequest.getDescription(),
                    milestoneRequest.getDueDate(),
                    milestoneRequest.getStatus()
            );
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error updating milestone: {}", e.getMessage(), e);
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
            logger.error("Error deleting milestone: {}", e.getMessage(), e);
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
            logger.error("Error fetching insights: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to generate milestone insights.");
        }
    }

    // --- Request DTO ---
    public static class MilestoneRequest {
        private String title;
        private String description;
        private LocalDate dueDate;
        private Milestone.Status status;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

        public Milestone.Status getStatus() { return status; }
        public void setStatus(Milestone.Status status) { this.status = status; }
    }
}
