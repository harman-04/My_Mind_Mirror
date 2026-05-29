package com.mymindmirror.backend.runner;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.DailyJournalSummaryRepository;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.repository.UserRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
@Order(2) // runs after the first runner (if any)
@RequiredArgsConstructor
@Slf4j
public class ExistingDataBackfillRunner implements CommandLineRunner {

    private final JournalEntryRepository journalEntryRepository;
    private final UserRepository userRepository;
    private final DailyJournalSummaryRepository summaryRepository;

    @Value("${backfill.enabled:false}")
    private boolean backfillEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!backfillEnabled) {
            log.info("Backfill not enabled. Set 'backfill.enabled=true' to run.");
            return;
        }

        log.info("Starting full backfill of word_count and daily_journal_summary...");

        // 1. Update word_count for all entries
        List<JournalEntry> allEntries = journalEntryRepository.findAll();
        int updated = 0;
        for (JournalEntry entry : allEntries) {
            User user = entry.getUser();
            if (user == null) continue;
            String userSecret = user.getPasswordHash();
            if (userSecret == null || userSecret.isEmpty()) continue;

            String decrypted = EncryptionUtil.decrypt(entry.getRawText(), userSecret);
            int wordCount = (decrypted == null || decrypted.trim().isEmpty()) ? 0 : decrypted.split("\\s+").length;
            if (entry.getWordCount() != wordCount) {
                entry.setWordCount(wordCount);
                updated++;
            }
        }
        journalEntryRepository.saveAll(allEntries);
        log.info("Updated word_count for {} entries.", updated);

        // 2. Rebuild summary table (delete old data and recreate from current entries)
        log.info("Rebuilding daily_journal_summary table...");
        summaryRepository.deleteAll();

        Map<UUID, Map<LocalDate, AggregatedData>> userDateMap = new HashMap<>();

        for (JournalEntry entry : allEntries) {
            User user = entry.getUser();
            if (user == null) continue;
            UUID userId = user.getId();
            LocalDate date = entry.getEntryDate();
            int wordCount = entry.getWordCount();
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

        for (Map.Entry<UUID, Map<LocalDate, AggregatedData>> userEntry : userDateMap.entrySet()) {
            UUID userId = userEntry.getKey();
            for (Map.Entry<LocalDate, AggregatedData> dateEntry : userEntry.getValue().entrySet()) {
                LocalDate date = dateEntry.getKey();
                AggregatedData agg = dateEntry.getValue();
                Double avgMood = (agg.moodCount > 0) ? agg.sumMood / agg.moodCount : null;
                summaryRepository.insertOrUpdateSummary(userId, date, avgMood, agg.totalWords, agg.entryCount);
            }
        }

        log.info("Backfill completed. Summary table rebuilt.");
    }

    private static class AggregatedData {
        long totalWords = 0;
        int entryCount = 0;
        double sumMood = 0;
        int moodCount = 0;
    }
}