package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "roadmap_tasks" ,
        indexes = {
                @Index(name = "idx_roadmap_task_roadmap", columnList = "roadmap_id"),
                @Index(name = "idx_roadmap_task_week", columnList = "week_number")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;


    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    @JsonIgnore
    private Roadmap roadmap;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String details;          //  longer instructions, tips, resources per task

    @Column(columnDefinition = "TEXT")
    private String subtasks;         //  JSON array of strings, e.g. ["subtask1", "subtask2"]

    @Column(name = "day_number")
    private Integer dayNumber;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "task_type")
    private String taskType; // "daily", "weekly", "milestone"

    @Column(name = "imported_to_milestone", nullable = false, columnDefinition = "boolean default false")
    private Boolean importedToMilestone = false;
}