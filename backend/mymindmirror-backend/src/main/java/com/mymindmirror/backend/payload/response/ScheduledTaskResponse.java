package com.mymindmirror.backend.payload.response;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduledTaskResponse(
        UUID id,
        String title,
        LocalDate scheduledDate,
        LocalTime startTime,
        LocalTime endTime,
        boolean completed,
        UUID roadmapTaskId,
        UUID milestoneTaskId,
        UUID customTaskId,
        String priority,
        String blockType
) {}
