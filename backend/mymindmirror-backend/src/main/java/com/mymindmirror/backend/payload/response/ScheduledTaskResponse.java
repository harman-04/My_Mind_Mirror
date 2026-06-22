package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledTaskResponse {
    private UUID id;
    private String title;
    private LocalDate scheduledDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean completed;
    private UUID roadmapTaskId;
    private UUID milestoneTaskId;
    private UUID customTaskId;
    private String priority;

    // --- 💡 NEW ---
    private String blockType;
}