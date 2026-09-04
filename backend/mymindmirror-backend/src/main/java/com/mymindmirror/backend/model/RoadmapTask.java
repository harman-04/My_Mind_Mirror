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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true) // 🔥 CRITICAL
@ToString(onlyExplicitlyIncluded = true) // 🔥 1. Add this
public class RoadmapTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    @EqualsAndHashCode.Include // 🔥 CRITICAL
    @ToString.Include // 🔥 2. Add this
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    @JsonIgnore
    private Roadmap roadmap;

    @Column(nullable = false, length = 500)
    @ToString.Include // 🔥 2. Add this
    private String description;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(columnDefinition = "TEXT")
    private String subtasks;

    @Column(name = "day_number")
    private Integer dayNumber;

    @Column(name = "week_number")
    @ToString.Include // 🔥 2. Add this
    private Integer weekNumber;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "task_type")
    private String taskType;

    @Column(name = "imported_to_milestone", nullable = false, columnDefinition = "boolean default false")
    private Boolean importedToMilestone = false;
}