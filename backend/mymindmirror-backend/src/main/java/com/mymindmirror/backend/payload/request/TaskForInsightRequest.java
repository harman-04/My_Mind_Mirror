// src/main/java/com/mymindmirror.backend/payload/request/TaskForInsightRequest.java
package com.mymindmirror.backend.payload.request;

import com.mymindmirror.backend.model.Task;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Nested DTO for task details within MilestoneInsightRequest.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskForInsightRequest {
    private String description;
    private LocalDate dueDate;
    private Task.Status status;
}