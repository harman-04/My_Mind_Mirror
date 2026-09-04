package com.mymindmirror.backend.payload.request;

import com.mymindmirror.backend.enums.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record TaskRequest(
//        @NotBlank(message = "Task description cannot be empty")
        String description,

        LocalDate dueDate,

//        @NotNull(message = "Task status is required")
        Status status,

        String details,

        List<String> subtasks
) {}