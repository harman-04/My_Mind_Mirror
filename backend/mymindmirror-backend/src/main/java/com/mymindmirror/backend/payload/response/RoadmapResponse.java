package com.mymindmirror.backend.payload.response;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record RoadmapResponse(
        UUID id,
        String title,
        String description,
        LocalDate createdAt,
        String status,
        Integer durationWeeks,
        List<TaskDto> tasks,
        List<ResourceDto> resources,
        List<MilestoneDto> milestones,
        Integer generatedWeeks,
        Integer originalDurationValue,
        String originalDurationUnit
) {
    public record TaskDto(UUID id, String description, Integer dayNumber, Integer weekNumber,
                          Boolean completed, String taskType, String details, List<String> subtasks,
                          Boolean importedToMilestone) {}
    public record ResourceDto(UUID id, String name, String url, String type) {}
    public record MilestoneDto(UUID id, String name, Integer weekNumber, Boolean achieved) {}
}