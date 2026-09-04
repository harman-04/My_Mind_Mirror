// src/main/java/com/mymindmirror/backend/payload/response/TaskResponse.java
package com.mymindmirror.backend.payload.response;
import com.mymindmirror.backend.enums.Status;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        String description,
        LocalDateTime creationTimestamp,
        LocalDate dueDate,
        Status status,
        String details,
        List<String> subtasks,
        UUID roadmapTaskId
) {}