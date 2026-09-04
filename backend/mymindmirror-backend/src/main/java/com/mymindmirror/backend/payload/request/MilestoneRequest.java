package com.mymindmirror.backend.payload.request;

import com.mymindmirror.backend.enums.Status;
import jakarta.validation.constraints.NotBlank; // ✅ Import
import jakarta.validation.constraints.NotNull; // ✅ Import

import java.time.LocalDate;

public record MilestoneRequest(
        @NotBlank(message = "Milestone title cannot be empty") // ✅ Ensures title isn't null or blank
        String title,

        String description, // Optional

        LocalDate dueDate,  // Optional

//        @NotNull(message = "Status cannot be null") // ✅ Ensures status is provided (crucial for updates)
        Status status
) {}