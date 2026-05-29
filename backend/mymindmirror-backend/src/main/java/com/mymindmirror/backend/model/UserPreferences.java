package com.mymindmirror.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "user_preferences"  ,
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
    private String availableHoursJson; // e.g., {"monday":[["09:00","12:00"],["13:00","17:00"]], ...}

    @Column(name = "timezone")
    private String timezone = "Asia/Kolkata";
}