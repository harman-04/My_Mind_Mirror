package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "roadmap_milestones")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    @JsonIgnore   // 👈 add this
    private Roadmap roadmap;

    @Column(nullable = false)
    private String name;

    @Column(name = "week_number")
    private Integer weekNumber; // which week this milestone is expected

    private boolean achieved = false;
}