package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.CustomTask;
import com.mymindmirror.backend.model.ScheduledTask;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.ScheduledTaskResponse;
import com.mymindmirror.backend.repository.CustomTaskRepository;
import com.mymindmirror.backend.repository.ScheduledTaskRepository;
import com.mymindmirror.backend.service.ScheduleService;
import com.mymindmirror.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final UserService userService;
    private final ScheduledTaskRepository scheduledTaskRepository;

    // NEW: Inject CustomTaskRepository to allow backwards syncing
    private final CustomTaskRepository customTaskRepository;

//    @PostMapping("/generate")
//    public ResponseEntity<?> generateSchedule(@AuthenticationPrincipal UserDetails userDetails) {
//        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
//        if (userOpt.isEmpty()) {
//            return ResponseEntity.status(401).body("User not found");
//        }
//        scheduleService.generateSchedule(userOpt.get());
//        return ResponseEntity.ok().body("Schedule generated");
//    }

    // In ScheduleController.java
    @PostMapping("/generate")
    public ResponseEntity<?> generateSchedule(@AuthenticationPrincipal UserDetails userDetails,
                                              @RequestParam(required = false, defaultValue = "all") String mode) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User not found");
        }
        scheduleService.generateSchedule(userOpt.get(), mode);
        return ResponseEntity.ok().body("Schedule generated");
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<ScheduledTaskResponse>> getScheduledTasks(@AuthenticationPrincipal UserDetails userDetails,
                                                                         @RequestParam String startDate,
                                                                         @RequestParam String endDate) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        List<ScheduledTask> tasks = scheduledTaskRepository.findByUserAndScheduledDateBetween(userOpt.get(), start, end);
        List<ScheduledTaskResponse> response = tasks.stream()
                .map(t -> new ScheduledTaskResponse(
                        t.getId(),
                        t.getTitle(),
                        t.getScheduledDate(),
                        t.getStartTime(),
                        t.getEndTime(),
                        t.isCompleted(),
                        t.getRoadmapTaskId(),
                        t.getMilestoneTaskId(),
                        t.getCustomTaskId(),
                        t.getPriority()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/task/{taskId}/move")
    public ResponseEntity<?> moveScheduledTask(@AuthenticationPrincipal UserDetails userDetails,
                                               @PathVariable UUID taskId,
                                               @RequestBody Map<String, String> request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        Optional<ScheduledTask> taskOpt = scheduledTaskRepository.findById(taskId);
        if (taskOpt.isEmpty() || !taskOpt.get().getUser().getId().equals(userOpt.get().getId()))
            return ResponseEntity.status(404).build();
        ScheduledTask task = taskOpt.get();
        task.setScheduledDate(LocalDate.parse(request.get("date")));
        task.setStartTime(LocalTime.parse(request.get("startTime")));
        task.setEndTime(LocalTime.parse(request.get("endTime")));
        scheduledTaskRepository.save(task);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/task/{taskId}/complete")
    public ResponseEntity<?> completeTask(@AuthenticationPrincipal UserDetails userDetails,
                                          @PathVariable UUID taskId) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        Optional<ScheduledTask> taskOpt = scheduledTaskRepository.findById(taskId);
        if (taskOpt.isEmpty() || !taskOpt.get().getUser().getId().equals(userOpt.get().getId()))
            return ResponseEntity.status(404).build();

        ScheduledTask task = taskOpt.get();
        task.setCompleted(true);
        scheduledTaskRepository.save(task);

        // --- NEW: BACKWARDS SYNC LOGIC ---
        // If this calendar event belongs to a Custom Task, mark the master task as complete too!
        if (task.getCustomTaskId() != null) {
            Optional<CustomTask> masterTaskOpt = customTaskRepository.findById(task.getCustomTaskId());
            if (masterTaskOpt.isPresent()) {
                CustomTask masterTask = masterTaskOpt.get();
                masterTask.setCompleted(true);
                customTaskRepository.save(masterTask);

                // Optional but recommended: Also mark any other calendar blocks for this task as complete
                List<ScheduledTask> linkedTasks = scheduledTaskRepository.findByCustomTaskId(masterTask.getId());
                for (ScheduledTask linkedTask : linkedTasks) {
                    if (!linkedTask.getId().equals(task.getId())) { // Skip the one we just saved
                        linkedTask.setCompleted(true);
                        scheduledTaskRepository.save(linkedTask);
                    }
                }
            }
        }

        return ResponseEntity.ok().build();
    }

    @PostMapping("/task/custom")
    public ResponseEntity<?> scheduleCustomTaskManually(@AuthenticationPrincipal UserDetails userDetails,
                                                        @RequestBody Map<String, String> request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        UUID customTaskId = UUID.fromString(request.get("customTaskId"));

        ScheduledTask scheduled = new ScheduledTask();
        scheduled.setUser(userOpt.get());
        scheduled.setCustomTaskId(customTaskId);
        scheduled.setTitle(request.get("title"));
        scheduled.setScheduledDate(LocalDate.parse(request.get("date")));
        scheduled.setStartTime(LocalTime.parse(request.get("startTime")));
        scheduled.setEndTime(LocalTime.parse(request.get("endTime")));
        scheduled.setCompleted(false);

        // Read the exact priority sent from React!
        scheduled.setPriority(request.getOrDefault("priority", "MEDIUM"));

        scheduledTaskRepository.save(scheduled);
        return ResponseEntity.ok().build();
    }
}