package com.mymindmirror.backend.payload.request;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CustomTaskRequest {
    private String title;
    private String description;
    private LocalDate dueDate;
    private Double estimatedHours;
    private String priority;
    private Boolean completed;
}