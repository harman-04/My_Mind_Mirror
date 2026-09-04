package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_stats",
        indexes = @Index(name = "idx_user_stats_user", columnList = "user_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserStats {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "current_streak")
    private int currentStreak = 0;

    @Column(name = "longest_streak")
    private int longestStreak = 0;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    @Column(name = "badges", columnDefinition = "TEXT")
    private String badgesJson; // Store as JSON array, e.g., ["FIRST_STEP", "THREE_DAY_STREAK"]

    @Column(name = "total_tasks_completed")
    private int totalTasksCompleted = 0;

    // --- 💡 FIX: Used 'Integer' (Object) instead of 'int' (Primitive) to allow NULLs from old DB rows ---
    @Column(name = "experience_points")
    private Integer experiencePoints = 0;

    @Column(name = "level")
    private Integer level = 1;

    @Column(name = "total_journal_entries")
    private Integer totalJournalEntries = 0;

    @Column(name = "total_chats")
    private Integer totalChats = 0;

    @Column(name = "schedules_generated")
    private Integer schedulesGenerated = 0;

    // --- 💡 FIX: Automatically upgrade old database rows when loaded! ---
    @PostLoad
    private void onPostLoad() {
        if (this.experiencePoints == null) this.experiencePoints = 0;
        if (this.level == null) this.level = 1;
        if (this.totalJournalEntries == null) this.totalJournalEntries = 0;
        if (this.totalChats == null) this.totalChats = 0;
        if (this.schedulesGenerated == null) this.schedulesGenerated = 0;
    }
}