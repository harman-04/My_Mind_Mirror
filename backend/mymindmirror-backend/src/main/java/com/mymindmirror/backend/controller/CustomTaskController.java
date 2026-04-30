package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.CustomTask;
import com.mymindmirror.backend.model.ScheduledTask;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.CustomTaskResponse;
import com.mymindmirror.backend.repository.CustomTaskRepository;
import com.mymindmirror.backend.repository.ScheduledTaskRepository;
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
    // INJECT THE SCHEDULED TASK REPOSITORY
    private final ScheduledTaskRepository scheduledTaskRepository;

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
                                                               @RequestBody CustomTask task) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        task.setId(null);
        task.setUser(userOpt.get());
        task.setCreatedAt(LocalDate.now());
        task.setCompleted(false);

        // Save to DB
        CustomTask saved = customTaskRepository.save(task);

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
                                                               @RequestBody CustomTask updatedTask) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        Optional<CustomTask> existingOpt = customTaskRepository.findById(id);
        if (existingOpt.isEmpty() || !existingOpt.get().getUser().getId().equals(userOpt.get().getId())) {
            return ResponseEntity.status(404).build();
        }

        CustomTask existing = existingOpt.get();
        existing.setTitle(updatedTask.getTitle());
        existing.setDescription(updatedTask.getDescription());
        existing.setDueDate(updatedTask.getDueDate());
        existing.setEstimatedHours(updatedTask.getEstimatedHours());

        if (updatedTask.getPriority() != null) {
            existing.setPriority(updatedTask.getPriority());
        }
        existing.setCompleted(updatedTask.isCompleted());

        // Save Custom Task to DB
        CustomTask saved = customTaskRepository.save(existing);

        // --- NEW SYNC LOGIC: Update all corresponding tasks on the calendar! ---
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

        // --- NEW SYNC LOGIC: Delete all corresponding tasks from the calendar! ---
        List<ScheduledTask> linkedTasks = scheduledTaskRepository.findByCustomTaskId(id);
        scheduledTaskRepository.deleteAll(linkedTasks);

        // Delete the master Custom Task
        customTaskRepository.delete(task.get());
        return ResponseEntity.noContent().build();
    }
}