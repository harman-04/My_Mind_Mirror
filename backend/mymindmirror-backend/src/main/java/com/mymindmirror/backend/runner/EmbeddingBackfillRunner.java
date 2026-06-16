package com.mymindmirror.backend.runner;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.KeyPhrase;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Order(5) // Run after other initialisations
@RequiredArgsConstructor
@Slf4j
public class EmbeddingBackfillRunner implements CommandLineRunner {

    private final JournalEntryRepository journalEntryRepository;
    private final VectorStore vectorStore;

    @Value("${rag.backfill.enabled:false}")
    private boolean backfillEnabled;

    @Override
    @Transactional(readOnly = true)
    public void run(String... args) {
        if (!backfillEnabled) {
            log.info("RAG vector backfill is disabled. Set 'rag.backfill.enabled=true' to run.");
            return;
        }

        log.info("Starting RAG backfill for existing journal entries...");

        // Fetch all entries that have been analysed (moodScore not null)
        List<JournalEntry> analysedEntries = journalEntryRepository.findAll().stream()
                .filter(entry -> entry.getMoodScore() != null)
                .collect(Collectors.toList());

        log.info("Found {} analysed entries to process into vectors.", analysedEntries.size());

        int successCount = 0;
        int skipCount = 0;
        int errorCount = 0;

        for (JournalEntry entry : analysedEntries) {
            try {
                String textToEmbed = buildTextForEmbedding(entry);
                if (textToEmbed.isBlank()) {
                    log.warn("Skipping entry {}: no text to embed", entry.getId());
                    skipCount++;
                    continue;
                }

                Document doc = Document.builder()
                        .id(entry.getId().toString())
                        .text(textToEmbed)
                        .metadata(Map.of(
                                "userId", entry.getUser().getId().toString(),
                                "entryId", entry.getId().toString()
                        ))
                        .build();

                vectorStore.add(List.of(doc));
                successCount++;

                if (successCount % 10 == 0) {
                    log.info("Processed {}/{} entries...", successCount, analysedEntries.size());
                }

                // SECURITY MEASURE: Pause for 1 second to avoid Gemini API Rate Limits!
                Thread.sleep(1000);

            } catch (Exception e) {
                log.error("Failed to create embedding for entry {}: {}", entry.getId(), e.getMessage());
                errorCount++;
            }
        }

        log.info("RAG backfill completed. Success: {}, Skipped: {}, Errors: {}", successCount, skipCount, errorCount);
    }

    private String buildTextForEmbedding(JournalEntry entry) {
        StringBuilder sb = new StringBuilder();
        if (entry.getSummary() != null && !entry.getSummary().isBlank()) {
            sb.append(entry.getSummary());
        }
        if (entry.getKeyPhrases() != null && !entry.getKeyPhrases().isEmpty()) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append("Key phrases: ");
            String phrases = entry.getKeyPhrases().stream()
                    .map(KeyPhrase::getPhrase)
                    .collect(Collectors.joining(", "));
            sb.append(phrases);
        }
        return sb.toString();
    }
}