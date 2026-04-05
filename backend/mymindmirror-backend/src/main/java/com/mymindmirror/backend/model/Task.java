// src/main/java/com/mymindmirror/backend/model/Task.java
package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a specific action or sub-goal associated with a Milestone.
 */
@Entity
@Table(name = "tasks")
@Data
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    @JsonBackReference // Prevents infinite recursion in JSON serialization
    private Milestone milestone;

    @Column(nullable = false)
    private String description;

    @Column(name = "creation_timestamp", nullable = false)
    private LocalDateTime creationTimestamp;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status; // E.g., PENDING, COMPLETED, OVERDUE

    @Column(name = "roadmap_task_id")
    private UUID roadmapTaskId;

    // Enum for Task status (can be same as Milestone or more granular)
    public enum Status {
        PENDING,
        COMPLETED,
        OVERDUE,
        CANCELLED
    }

    // Constructors
    public Task() {
        this.creationTimestamp = LocalDateTime.now();
        this.status = Status.PENDING;
    }

    public Task(Milestone milestone, String description, LocalDate dueDate) {
        this(); // Call default constructor to set creationTimestamp and initial status
        this.milestone = milestone;
        this.description = description;
        this.dueDate = dueDate;
    }


}
