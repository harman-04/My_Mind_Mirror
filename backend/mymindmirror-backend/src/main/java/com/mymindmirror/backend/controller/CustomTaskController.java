package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.CustomTask;
import com.mymindmirror.backend.model.ScheduledTask;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.CustomTaskRequest; // NEW IMPORT
import com.mymindmirror.backend.payload.response.CustomTaskResponse;
import com.mymindmirror.backend.repository.CustomTaskRepository;
import com.mymindmirror.backend.repository.ScheduledTaskRepository;
import com.mymindmirror.backend.service.GamificationService;
import com.mymindmirror.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/custom-tasks")
@RequiredArgsConstructor
public class CustomTaskController {

    private final CustomTaskRepository customTaskRepository;
    private final UserService userService;
    private final ScheduledTaskRepository scheduledTaskRepository;
    private final GamificationService gamificationService;

    @GetMapping
    public ResponseEntity<List<CustomTaskResponse>> getUserTasks(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        List<CustomTask> tasks = customTaskRepository.findByUserOrderByCreatedAtDesc(userOpt.get());
        List<CustomTaskResponse> response = tasks.stream()
                .map(t -> new CustomTaskResponse(
                        t.getId(), t.getTitle(), t.getDescription(),
                        t.getDueDate(), t.getEstimatedHours(),
                        t.getPriority(), t.isCompleted(), t.getCreatedAt()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<CustomTaskResponse> createCustomTask(@AuthenticationPrincipal UserDetails userDetails,
                                                               @RequestBody CustomTaskRequest request) { // CHANGED HERE
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        // Map DTO to Entity manually
        CustomTask task = new CustomTask();
        task.setUser(userOpt.get());
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription() != null ? request.getDescription() : "");
        task.setDueDate(request.getDueDate());
        task.setEstimatedHours(request.getEstimatedHours() != null ? request.getEstimatedHours() : 1.0);
        task.setPriority(request.getPriority() != null ? request.getPriority() : "MEDIUM");
        task.setCompleted(request.getCompleted() != null ? request.getCompleted() : false);
        task.setCreatedAt(LocalDate.now());

        // Save to DB
        CustomTask saved = customTaskRepository.save(task);

        gamificationService.recordActivity(userOpt.get(), "TASK_CREATE");

        // Map to Response DTO
        CustomTaskResponse response = new CustomTaskResponse(
                saved.getId(), saved.getTitle(), saved.getDescription(),
                saved.getDueDate(), saved.getEstimatedHours(),
                saved.getPriority(), saved.isCompleted(), saved.getCreatedAt()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomTaskResponse> updateCustomTask(@AuthenticationPrincipal UserDetails userDetails,
                                                               @PathVariable UUID id,
                                                               @RequestBody CustomTaskRequest request) { // CHANGED HERE
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        Optional<CustomTask> existingOpt = customTaskRepository.findById(id);
        if (existingOpt.isEmpty() || !existingOpt.get().getUser().getId().equals(userOpt.get().getId())) {
            return ResponseEntity.status(404).build();
        }

        CustomTask existing = existingOpt.get();
        existing.setTitle(request.getTitle());
        existing.setDescription(request.getDescription() != null ? request.getDescription() : "");
        existing.setDueDate(request.getDueDate());
        existing.setEstimatedHours(request.getEstimatedHours() != null ? request.getEstimatedHours() : 1.0);

        if (request.getPriority() != null) {
            existing.setPriority(request.getPriority());
        }
        if (request.getCompleted() != null) {
            existing.setCompleted(request.getCompleted());
        }

        // Save Custom Task to DB
        CustomTask saved = customTaskRepository.save(existing);

        // --- SYNC LOGIC: Update all corresponding tasks on the calendar! ---
        List<ScheduledTask> linkedTasks = scheduledTaskRepository.findByCustomTaskId(saved.getId());
        for(ScheduledTask st : linkedTasks) {
            st.setTitle(saved.getTitle());         // Sync title changes
            st.setPriority(saved.getPriority());   // Sync priority/color changes
            st.setCompleted(saved.isCompleted());  // Sync completion status!
            scheduledTaskRepository.save(st);
        }

        // Map to Response DTO
        CustomTaskResponse response = new CustomTaskResponse(
                saved.getId(), saved.getTitle(), saved.getDescription(),
                saved.getDueDate(), saved.getEstimatedHours(),
                saved.getPriority(), saved.isCompleted(), saved.getCreatedAt()
        );

        // --- 💡 NEW: Gamification Sync ---
        // If the task wasn't completed before, but it is now, reward them!
        if (!existing.isCompleted() && saved.isCompleted()) {
            gamificationService.recordActivity(userOpt.get(), "TASK");
        }

        // Map to Response DTO...
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomTask(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable UUID id) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        Optional<CustomTask> task = customTaskRepository.findById(id);
        if (task.isEmpty() || !task.get().getUser().getId().equals(userOpt.get().getId()))
            return ResponseEntity.status(404).build();

        // Delete all corresponding tasks from the calendar!
        List<ScheduledTask> linkedTasks = scheduledTaskRepository.findByCustomTaskId(id);
        scheduledTaskRepository.deleteAll(linkedTasks);

        // Delete the master Custom Task
        customTaskRepository.delete(task.get());
        return ResponseEntity.noContent().build();
    }
}