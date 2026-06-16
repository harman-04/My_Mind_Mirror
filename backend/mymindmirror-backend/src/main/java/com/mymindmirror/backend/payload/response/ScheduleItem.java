package com.mymindmirror.backend.payload.response;

public record ScheduleItem(
        String taskId,
        String date,
        String startTime,
        String endTime
) {}