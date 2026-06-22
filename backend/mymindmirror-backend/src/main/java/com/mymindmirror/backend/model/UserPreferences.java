package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "user_preferences",
        indexes = @Index(name = "idx_user_pref_user", columnList = "user_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferences {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private User user;

    @Column(name = "available_hours", columnDefinition = "TEXT")
    private String availableHoursJson; // e.g., {"monday":[["09:00","12:00"]...]}

    @Column(name = "timezone")
    private String timezone = "Asia/Kolkata";

    // --- NEW LIFESTYLE FIELDS FOR SMART AI TIMETABLE ---

    @Column(name = "energy_peak", length = 20)
    private String energyPeak = "MORNING"; // Options: MORNING, AFTERNOON, EVENING

    @Column(name = "wake_time")
    private LocalTime wakeTime = LocalTime.of(7, 0); // Default 7:00 AM

    @Column(name = "sleep_time")
    private LocalTime sleepTime = LocalTime.of(23, 0); // Default 11:00 PM

    @Column(name = "lunch_time")
    private LocalTime lunchTime = LocalTime.of(13, 0); // Default 1:00 PM

    @Column(name = "daily_habits", columnDefinition = "TEXT")
    private String dailyHabitsJson = "[]"; // e.g. ["30 mins workout", "15 mins read"]
}