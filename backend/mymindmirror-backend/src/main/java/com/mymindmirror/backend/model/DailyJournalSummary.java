package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_journal_summary")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyJournalSummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private UUID userId;
    private LocalDate date;
    private Double avgMood;
    private Long totalWords;
    private Integer entryCount;
}