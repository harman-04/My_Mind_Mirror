package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "roadmap_milestones" ,
        indexes = @Index(name = "idx_roadmap_mil_roadmap", columnList = "roadmap_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapMilestone {

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

    @Column(nullable = false)
    private String name;

    @Column(name = "week_number")
    private Integer weekNumber; // which week this milestone is expected

    private boolean achieved = false;
}