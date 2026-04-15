// src/main/java/com/mymindmirror.backend/model/Milestone.java
package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.mymindmirror.backend.enums.Status;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Represents a user-defined long-term goal or milestone.
 * Each milestone can have multiple associated tasks.
 */
@Entity
@Table(name = "milestones")
@Data
public class Milestone {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY) // Keep LAZY for User to avoid circular dependency issues with User
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference // Prevents infinite recursion in JSON serialization
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "creation_date", nullable = false)
    private LocalDate creationDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status; // E.g., PENDING, IN_PROGRESS, COMPLETED, OVERDUE

    @OneToMany(mappedBy = "milestone", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("creationTimestamp ASC") // Order tasks by creation time
    private List<Task> tasks = new ArrayList<>();



    // Constructors
    public Milestone() {
        this.creationDate = LocalDate.now();
        this.status = Status.PENDING;
    }

    public Milestone(User user, String title, String description, LocalDate dueDate) {
        this(); // Call default constructor to set creationDate and initial status
        this.user = user;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
    }

    /**
     * Helper method to add a task to the milestone.
     * Ensures bidirectional relationship is maintained.
     * @param task The task to add.
     */
    public void addTask(Task task) {
        this.tasks.add(task);
        task.setMilestone(this);
    }

    /**
     * Helper method to remove a task from the milestone.
     * Ensures bidirectional relationship is maintained.
     * @param task The task to remove.
     */
    public void removeTask(Task task) {
        this.tasks.remove(task);
        task.setMilestone(null);
    }

    /**
     * Calculates the completion percentage of the milestone based on its tasks.
     * @return Completion percentage (0-100).
     */
    @Transient // Not persisted in DB, calculated on the fly
    public double getCompletionPercentage() {
        if (tasks.isEmpty()) {
            return 0.0;
        }
        long completedTasks = tasks.stream()
                .filter(task -> task.getStatus() == Status.COMPLETED)
                .count();
        return (double) completedTasks / tasks.size() * 100.0;
    }
}
