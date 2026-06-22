// src/main/java/com/mymindmirror/backend/payload/response/ScheduleItem.java
package com.mymindmirror.backend.payload.response;

public record ScheduleItem(
        String taskId,     // Will be null for breaks/meals
        String title,      // The AI will provide a title like "Lunch" or "Meditate"
        String blockType,  // WORK_TASK, ROUTINE, BREAK, or MEAL
        String date,
        String startTime,
        String endTime
) {}