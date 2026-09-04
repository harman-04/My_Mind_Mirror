package com.mymindmirror.backend.payload.response;
import java.time.LocalDate;
import java.util.UUID;

public record CustomTaskResponse(
        UUID id,
        String title,
        String description,
        LocalDate dueDate,
        Double estimatedHours,
        String priority,
        boolean completed,
        LocalDate createdAt
) {}