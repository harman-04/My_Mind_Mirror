package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "journal_entry_key_phrases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KeyPhrase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "key_phrase", columnDefinition = "TEXT", nullable = false)
    private String phrase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_entry_id")
    @JsonIgnore // Prevents circular reference in JSON
    private JournalEntry journalEntry;

    public KeyPhrase(String phrase, JournalEntry journalEntry) {
        this.phrase = phrase;
        this.journalEntry = journalEntry;
    }
}