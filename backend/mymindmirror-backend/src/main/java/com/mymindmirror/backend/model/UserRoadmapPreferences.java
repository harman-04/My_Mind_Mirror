// src/main/java/com/mymindmirror/backend/model/UserRoadmapPreferences.java
package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "user_roadmap_preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRoadmapPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private User user;

    @Column(name = "difficulty", nullable = false)
    private String difficulty = "BEGINNER"; // BEGINNER, INTERMEDIATE, ADVANCED

    @Column(name = "language_preference")
    private String languagePreference = "en"; // ISO code, e.g., en, hi, es

    @Column(name = "learning_style")
    private String learningStyle = "READING"; // VISUAL, READING, HANDS_ON

    @Column(name = "hours_per_week")
    private Integer hoursPerWeek = 10;

    @Column(name = "avoid_weekends")
    private boolean avoidWeekends = false;
}