package com.mymindmirror.backend.payload.response;
// ds 2
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapResponse {
    private UUID id;
    private String title;
    private String description;
    private LocalDate createdAt;
    private String status;
    private Integer durationWeeks;
    private List<TaskDto> tasks;
    private List<ResourceDto> resources;
    private List<MilestoneDto> milestones;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskDto {
        private UUID id;
        private String description;
        private Integer dayNumber;
        private Integer weekNumber;
        private Boolean completed;
        private String taskType;
        private String details;
        private List<String> subtasks;  // or String if you store as JSON
        private Boolean importedToMilestone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceDto {
        private UUID id;
        private String name;
        private String url;
        private String type;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneDto {
        private UUID id;
        private String name;
        private Integer weekNumber;
        private Boolean achieved;
    }
}