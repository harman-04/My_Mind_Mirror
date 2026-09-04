package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.KeyPhrase;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingGenerationService {

    private final VectorStore vectorStore;

    /**
     * Builds a concise text representation of a journal entry for embedding.
     * Uses summary + key phrases. Assumes the entry is fully loaded (including keyPhrases).
     */
    private String buildTextForEmbedding(JournalEntry entry) {
        StringBuilder sb = new StringBuilder();
        if (entry.getSummary() != null && !entry.getSummary().isBlank()) {
            sb.append(entry.getSummary());
        }
        if (entry.getKeyPhrases() != null && !entry.getKeyPhrases().isEmpty()) {
            if (sb.length() > 0) sb.append(" ");
            sb.append("Key phrases: ");
            String phrases = entry.getKeyPhrases().stream()
                    .map(KeyPhrase::getPhrase)
                    .collect(Collectors.joining(", "));
            sb.append(phrases);
        }
        return sb.toString();
    }

    /**
     * Generates an embedding for a journal entry and stores it in the vector database.
     * Assumes the entry is already fully loaded (including keyPhrases).
     *
     * @param entry  The JournalEntry entity (must have keyPhrases initialized)
     * @param userId The user ID (for metadata filtering)
     */
    @Async
    public void generateAndStoreEmbedding(JournalEntry entry, UUID userId) {
        if (entry == null || entry.getMoodScore() == null) {
            log.warn("Entry is null or not analysed yet, cannot generate embedding");
            return;
        }

        String textToEmbed = buildTextForEmbedding(entry);
        if (textToEmbed.isBlank()) {
            log.warn("No text to embed for entry {}", entry.getId());
            return;
        }

        try {
            Document doc = Document.builder()
                    .id(entry.getId().toString())
                    .text(textToEmbed)
                    .metadata(Map.of(
                            "userId", userId.toString(),
                            "entryId", entry.getId().toString()
                    ))
                    .build();

            vectorStore.add(List.of(doc));
            log.info("Stored embedding for entry {}", entry.getId());
        } catch (Exception e) {
            log.error("Failed to generate/store embedding for entry {}: {}", entry.getId(), e.getMessage(), e);
        }
    }

    /**
     * Deletes the embedding for a given entry ID.
     */
    @Async
    public void deleteEmbedding(UUID entryId) {
        log.info("Deleting embedding for entry: {}", entryId);
        try {
            vectorStore.delete(List.of(entryId.toString()));
            log.info("Deleted embedding for entry {}", entryId);
        } catch (Exception e) {
            log.error("Failed to delete embedding for entry {}: {}", entryId, e.getMessage(), e);
        }
    }

    /**
     * Updates the embedding for an entry by deleting the old one and generating a new one.
     * Assumes the entry is fully loaded.
     */
    @Async
    public void updateEmbedding(JournalEntry entry, UUID userId) {
        deleteEmbedding(entry.getId());
        generateAndStoreEmbedding(entry, userId);
    }

    public VectorStore getVectorStore() {
        return this.vectorStore;
    }
}