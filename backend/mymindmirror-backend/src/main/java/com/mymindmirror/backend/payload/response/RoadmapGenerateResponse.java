package com.mymindmirror.backend.payload.response;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapGenerateResponse {
    private String title;
    private Integer durationWeeks;
    private List<Phase> phases;
    private List<Task> tasks;
    private List<Resource> resources;
    private List<Milestone> milestones;

    @Data
    public static class Phase {
        private String name;
        private Integer weeks;
        private String description;
    }

    @Data
    public static class Task {
        private Integer day;
        private Integer week;
        private String description;
        private String type; // "daily", "weekly"
        private String details;          // ← add
        private List<String> subtasks;    // ← add
    }

    @Data
    public static class Resource {
        private String name;
        private String url;
        private String type;
    }

    @Data
    public static class Milestone {
        private String name;
        private Integer week;
    }
}