// src/main/java/com/mymindmirror/backend/payload/response/MilestoneResponse.java
package com.mymindmirror.backend.payload.response;
import com.mymindmirror.backend.enums.Status;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MilestoneResponse(
        UUID id,
        String title,
        String description,
        LocalDate creationDate,
        LocalDate dueDate,
        Status status,
        double completionPercentage,
        List<TaskResponse> tasks
) {}