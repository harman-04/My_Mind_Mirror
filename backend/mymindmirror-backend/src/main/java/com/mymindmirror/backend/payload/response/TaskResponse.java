// src/main/java/com/mymindmirror/backend/payload/response/TaskResponse.java
package com.mymindmirror.backend.payload.response;

import com.mymindmirror.backend.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private UUID id;
    private String description;
    private LocalDateTime creationTimestamp;
    private LocalDate dueDate;
    private Status status;
    private String details;
    private List<String> subtasks;
    private UUID roadmapTaskId; // if linked to roadmap
}