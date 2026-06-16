package com.mymindmirror.backend.payload.response;

import java.util.List;

public record RescheduleResponse(
        Integer newDurationWeeks,
        List<TaskUpdate> tasks
) {
    public record TaskUpdate(
            Integer taskId,   // index of the task in the remainingTasks list
            Integer newWeek
    ) {}
}