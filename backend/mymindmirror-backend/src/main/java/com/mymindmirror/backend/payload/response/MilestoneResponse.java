// src/main/java/com/mymindmirror/backend/payload/response/MilestoneResponse.java
package com.mymindmirror.backend.payload.response;

import com.mymindmirror.backend.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneResponse {
    private UUID id;
    private String title;
    private String description;
    private LocalDate creationDate;
    private LocalDate dueDate;
    private Status status;
    private double completionPercentage;
    private List<TaskResponse> tasks;
}