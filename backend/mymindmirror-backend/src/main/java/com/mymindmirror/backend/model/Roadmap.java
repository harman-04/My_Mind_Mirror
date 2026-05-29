package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDate;
import java.util.*;

@Entity
@NamedEntityGraph(name = "Roadmap.withAll", attributeNodes = {
        @NamedAttributeNode("resources"),
        @NamedAttributeNode("milestones")
})
@Table(name = "roadmaps" ,
        indexes = {
                @Index(name = "idx_roadmap_user", columnList = "user_id"),
                @Index(name = "idx_roadmap_created", columnList = "created_at")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Roadmap {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDate createdAt;

    @Column(nullable = false)
    private String status; // PLANNED, ACTIVE, COMPLETED


    @BatchSize(size = 10)
    @OrderBy("weekNumber ASC, dayNumber ASC")
    @OneToMany(mappedBy = "roadmap", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RoadmapTask> tasks = new ArrayList<>();

    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @OneToMany(mappedBy = "roadmap", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<RoadmapResource> resources = new HashSet<>();

    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @OneToMany(mappedBy = "roadmap", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<RoadmapMilestone> milestones = new HashSet<>();

    @Column(name = "duration_weeks")
    private Integer durationWeeks;

    @Column(name = "original_duration_value")
    private Integer originalDurationValue;

    @Column(name = "original_duration_unit")
    private String originalDurationUnit;

    // Add this field
    @Column(name = "generated_weeks")
    private Integer generatedWeeks = 0; // maximum week number that has detailed tasks

    public boolean isFullyGenerated() {
        return generatedWeeks != null && generatedWeeks >= durationWeeks;
    }

    public Roadmap(User user, String title, String description, Integer durationWeeks) {
        this.user = user;
        this.title = title;
        this.description = description;
        this.durationWeeks = durationWeeks;
        this.createdAt = LocalDate.now();
        this.status = "PLANNED";
    }
}