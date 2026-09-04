package com.mymindmirror.backend.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CustomTaskRequest(
        @NotBlank(message = "Title cannot be empty")
        String title,

        String description,

        LocalDate dueDate,

        @NotNull(message = "Estimated hours are required")
        Double estimatedHours,

        String priority,

        Boolean completed
) {}