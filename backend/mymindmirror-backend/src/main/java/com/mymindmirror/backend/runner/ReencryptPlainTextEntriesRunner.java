/*

package com.mymindmirror.backend.runner;
import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
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

import java.util.List;

@Component
@Order(3) // runs after other runners (schema, backfill)
@RequiredArgsConstructor
@Slf4j
public class ReencryptPlainTextEntriesRunner implements CommandLineRunner {

    private final JournalEntryRepository journalEntryRepository;
    private final UserRepository userRepository;

    @Value("${reencrypt.plaintext.enabled:false}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Plain‑text re‑encryption not enabled. Set 'reencrypt.plaintext.enabled=true' to run.");
            return;
        }

        log.info("Starting re‑encryption of plain‑text journal entries...");

        List<JournalEntry> allEntries = journalEntryRepository.findAll();
        int fixedCount = 0;

        for (JournalEntry entry : allEntries) {
            User user = entry.getUser();
            if (user == null) continue;
            String userSecret = user.getPasswordHash();
            if (userSecret == null || userSecret.isEmpty()) continue;

            String rawText = entry.getRawText();
            String decrypted = EncryptionUtil.decrypt(rawText, userSecret);

            // If decryption returned the same string as input, it means the entry was not encrypted.
            // (Encryption produces Base64, which is different from plain text.)
            if (rawText.equals(decrypted)) {
                log.info("Found plain‑text entry ID {} for user {}. Re‑encrypting.", entry.getId(), user.getUsername());
                String reEncrypted = EncryptionUtil.encrypt(decrypted, userSecret);
                if (reEncrypted != null) {
                    entry.setRawText(reEncrypted);
                    // Recalculate word count from plain text (decrypted)
                    int wordCount = decrypted.trim().isEmpty() ? 0 : decrypted.split("\\s+").length;
                    entry.setWordCount(wordCount);
                    fixedCount++;
                } else {
                    log.error("Failed to re‑encrypt entry ID {}", entry.getId());
                }
            }
        }

        if (fixedCount > 0) {
            journalEntryRepository.saveAll(allEntries);
            log.info("Re‑encrypted {} plain‑text entries.", fixedCount);
        } else {
            log.info("No plain‑text entries found.");
        }

        log.info("Re‑encryption completed.");
    }
}

*/