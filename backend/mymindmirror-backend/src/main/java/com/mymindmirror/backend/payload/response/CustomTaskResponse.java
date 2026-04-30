package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@AllArgsConstructor
public class CustomTaskResponse {
    private UUID id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private Double estimatedHours;
    private String priority;
    private boolean completed;
    private LocalDate createdAt;
}