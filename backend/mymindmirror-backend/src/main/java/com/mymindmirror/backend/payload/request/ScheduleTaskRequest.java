package com.mymindmirror.backend.payload.request;

import lombok.Data;

import java.util.List;

@Data
public class ScheduleTaskRequest {
    private List<TaskItem> tasks;
    private String availableHours; // JSON string

    @Data
    public static class TaskItem {
        private String id;
        private String title;
        private Double estimatedHours;
        private String dueDate;
        private String priority;
    }
}