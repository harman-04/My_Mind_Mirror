package com.mymindmirror.backend.payload.request;
import java.util.List;

public record ScheduleTaskRequest(List<TaskItem> tasks, String availableHours) {
    public record TaskItem(String id, String title, Double estimatedHours, String dueDate, String priority) {}
}