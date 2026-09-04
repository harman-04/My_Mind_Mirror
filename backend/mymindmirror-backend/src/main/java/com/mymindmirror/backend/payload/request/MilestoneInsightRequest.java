// src/main/java/com/mymindmirror.backend/payload/request/MilestoneInsightRequest.java
package com.mymindmirror.backend.payload.request;
import com.mymindmirror.backend.enums.Status;
import java.time.LocalDate;
import java.util.List;

public record MilestoneInsightRequest(
        String title,
        String description,
        LocalDate dueDate,
        Status status,
        double completionPercentage,
        List<TaskForInsightRequest> tasks
) {}
