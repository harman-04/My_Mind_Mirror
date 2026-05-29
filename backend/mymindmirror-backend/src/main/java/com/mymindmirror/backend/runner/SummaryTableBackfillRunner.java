package com.mymindmirror.backend.runner;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.DailyJournalSummaryRepository;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Order(1)  // ensure it runs after Liquibase (if enabled) but before main app
@RequiredArgsConstructor
@Slf4j
public class SummaryTableBackfillRunner implements CommandLineRunner {

    private final JournalEntryRepository journalEntryRepository;
    private final DailyJournalSummaryRepository summaryRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // Only run once – we can check if summary table is already populated
        if (summaryRepository.count() > 0) {
            log.info("Summary table already has data. Skipping backfill.");
            return;
        }

        log.info("Starting backfill of word_count and daily_journal_summary for existing entries...");

        // 1. Fetch all journal entries (across all users)
        List<JournalEntry> allEntries = journalEntryRepository.findAll();

        // 2. Map to store aggregated data per (user_id, date)
        Map<UUID, Map<LocalDate, AggregatedData>> userDateMap = new HashMap<>();

        for (JournalEntry entry : allEntries) {
            User user = entry.getUser();
            if (user == null) continue;

            UUID userId = user.getId();
            LocalDate date = entry.getEntryDate();
            String userSecret = user.getPasswordHash();
            if (userSecret == null) continue;

            // Decrypt and compute word count
            String decrypted = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
            int wordCount = (decrypted == null || decrypted.trim().isEmpty()) ? 0 : decrypted.split("\\s+").length;

            // Update the entry's word_count (for future anomaly detection)
            entry.setWordCount(wordCount);
            journalEntryRepository.save(entry);  // save immediately (batch would be better but fine for one‑time)

            // Aggregate for summary table
            Double moodScore = entry.getMoodScore();
            userDateMap.computeIfAbsent(userId, k -> new HashMap<>())
                    .compute(date, (k, agg) -> {
                        if (agg == null) agg = new AggregatedData();
                        agg.totalWords += wordCount;
                        agg.entryCount++;
                        if (moodScore != null) {
                            agg.sumMood += moodScore;
                            agg.moodCount++;
                        }
                        return agg;
                    });
        }

        // 3. Insert aggregated rows into daily_journal_summary
        for (Map.Entry<UUID, Map<LocalDate, AggregatedData>> userEntry : userDateMap.entrySet()) {
            UUID userId = userEntry.getKey();
            for (Map.Entry<LocalDate, AggregatedData> dateEntry : userEntry.getValue().entrySet()) {
                LocalDate date = dateEntry.getKey();
                AggregatedData agg = dateEntry.getValue();
                Double avgMood = (agg.moodCount > 0) ? agg.sumMood / agg.moodCount : null;
                summaryRepository.insertOrUpdateSummary(userId, date, avgMood, agg.totalWords, agg.entryCount);
            }
        }

        log.info("Backfill completed. Processed {} entries.", allEntries.size());
    }

    private static class AggregatedData {
        long totalWords = 0;
        int entryCount = 0;
        double sumMood = 0;
        int moodCount = 0;
    }
}