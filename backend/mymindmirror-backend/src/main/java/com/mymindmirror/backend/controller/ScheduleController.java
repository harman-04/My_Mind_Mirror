package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.annotation.CurrentUser;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.MoveScheduledTaskRequest;
import com.mymindmirror.backend.payload.request.ScheduleCustomTaskRequest;
import com.mymindmirror.backend.payload.response.ScheduledTaskResponse;
import com.mymindmirror.backend.service.ScheduleService;
import com.mymindmirror.backend.util.DateRange;
import com.mymindmirror.backend.util.DateUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping("/generate")
    public ResponseEntity<String> generateSchedule(
            @CurrentUser User currentUser,
            @RequestParam(required = false, defaultValue = "all") String mode) {
        scheduleService.generateSchedule(currentUser, mode);
        return ResponseEntity.ok("Schedule generated");
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<ScheduledTaskResponse>> getScheduledTasks(
            @CurrentUser User currentUser,
            @RequestParam String startDate,
            @RequestParam String endDate) {

        // Strict parsing – validates that both are present and start <= end
        DateRange range = DateUtil.parseStrictDateRange(startDate, endDate);
        List<ScheduledTaskResponse> tasks = scheduleService.getScheduledTasks(
                currentUser, range.start(), range.end()
        );
        return ResponseEntity.ok(tasks);
    }

//    @PutMapping("/task/{taskId}/move")
//    public ResponseEntity<Void> moveScheduledTask(
//            @CurrentUser User currentUser,
//            @PathVariable UUID taskId,
//            @RequestBody Map<String, String> request) {
//
//        String date = request.get("date");
//        String startTime = request.get("startTime");
//        String endTime = request.get("endTime");
//
//        if (date == null || startTime == null || endTime == null) {
//            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields: date, startTime, or endTime");
//        }
//
//        scheduleService.moveScheduledTask(taskId, currentUser, date, startTime, endTime);
//        return ResponseEntity.ok().build();
//    }

    @PutMapping("/task/{taskId}/move")
    public ResponseEntity<Void> moveScheduledTask(
            @CurrentUser User currentUser,
            @PathVariable UUID taskId,
            @Valid @RequestBody MoveScheduledTaskRequest request) {

        // ✅ Directly pass typed fields – no parsing!
        scheduleService.moveScheduledTask(taskId, currentUser, request.date(), request.startTime(), request.endTime());
        return ResponseEntity.ok().build();
    }


    @PatchMapping("/task/{taskId}/complete")
    public ResponseEntity<Void> completeTask(
            @CurrentUser User currentUser,
            @PathVariable UUID taskId) {
        scheduleService.completeTask(taskId, currentUser);
        return ResponseEntity.ok().build();
    }

//    @PostMapping("/task/custom")
//    public ResponseEntity<Void> scheduleCustomTaskManually(
//            @CurrentUser User currentUser,
//            @RequestBody Map<String, String> request) {
//
//        String customTaskIdStr = request.get("customTaskId");
//        String title = request.get("title");
//        String date = request.get("date");
//        String startTime = request.get("startTime");
//        String endTime = request.get("endTime");
//        String priority = request.getOrDefault("priority", "MEDIUM");
//
//        if (customTaskIdStr == null || title == null || date == null || startTime == null || endTime == null) {
//            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields: customTaskId, title, date, startTime, or endTime");
//        }
//
//        UUID customTaskId = UUID.fromString(customTaskIdStr);
//        scheduleService.scheduleCustomTaskManually(currentUser, customTaskId, title, date, startTime, endTime, priority);
//        return ResponseEntity.ok().build();
//    }

    @PostMapping("/task/custom")
    public ResponseEntity<Void> scheduleCustomTaskManually(
            @CurrentUser User currentUser,
            @Valid @RequestBody ScheduleCustomTaskRequest request) {

        // ✅ All fields are typed – UUID, LocalDate, LocalTime – pass directly
        scheduleService.scheduleCustomTaskManually(
                currentUser,
                request.customTaskId(),
                request.title(),
                request.date(),
                request.startTime(),
                request.endTime(),
                request.priority()
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reoptimize")
    public ResponseEntity<String> reoptimizeToday(@CurrentUser User currentUser) {
        scheduleService.reoptimizeToday(currentUser);
        return ResponseEntity.ok("Today re-optimized");
    }
}