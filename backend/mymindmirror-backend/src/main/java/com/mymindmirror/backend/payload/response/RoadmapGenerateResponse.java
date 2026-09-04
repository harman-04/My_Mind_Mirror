package com.mymindmirror.backend.payload.response;
import java.util.List;

public record RoadmapGenerateResponse(
        String title,
        Integer durationWeeks,
        List<Phase> phases,
        List<Task> tasks,
        List<Resource> resources,
        List<Milestone> milestones,
        Boolean isFallback
) {
    public record Phase(String name, Integer weeks, String description) {}
    public record Task(Integer day, Integer week, String description, String type,
                       String details, List<String> subtasks) {}
    public record Resource(String name, String url, String type) {}
    public record Milestone(String name, Integer week) {}
}