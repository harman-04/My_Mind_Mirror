// In src/main/java/com/mymindmirror/backend/model/JournalEntry.java

package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Represents a single journal entry made by a user.
 * Stores the raw text, the date of the entry, and AI analysis results.
 */
@Entity
@Table(name = "journal_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JournalEntry {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // FIX: Changed FetchType from LAZY to EAGER to resolve LazyInitializationException for User
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate; // Date of the entry (e.g., 2023-10-26)

    @CreationTimestamp // This annotation tells Hibernate to set the timestamp on creation
    @Column(name = "creation_timestamp", nullable = false, updatable = false) // updatable=false is good practice for creation timestamps
    private LocalDateTime creationTimestamp; // Exact timestamp of when the entry was created

    @Column(name = "raw_text", columnDefinition = "TEXT", nullable = false)
    private String rawText;

    // AI Analysis Fields (can be nullable if ML service fails)
    @Column(name = "mood_score")
    private Double moodScore;

    @Column(name = "emotions", columnDefinition = "TEXT")
    private String emotions; // Stored as JSON string

    @Column(name = "core_concerns", columnDefinition = "TEXT")
    private String coreConcerns; // Stored as JSON string

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "growth_tips", columnDefinition = "TEXT")
    private String growthTips; // Stored as JSON string

    // ⭐ FIX: Changed FetchType from LAZY to EAGER for keyPhrases to resolve LazyInitializationException ⭐
    @ElementCollection(fetch = FetchType.EAGER) // Stores collection of simple types
    @CollectionTable(name = "journal_entry_key_phrases", joinColumns = @JoinColumn(name = "journal_entry_id"))
    @Column(name = "key_phrase", columnDefinition = "TEXT")
    private List<String> keyPhrases;

    // NEW FIELD for Clustering
    @Column(name = "cluster_id")
    private Integer clusterId; // Stores the ID of the cluster this entry belongs to
}
