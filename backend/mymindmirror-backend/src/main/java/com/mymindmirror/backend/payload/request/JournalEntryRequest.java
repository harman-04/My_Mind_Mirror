package com.mymindmirror.backend.payload.request;

import lombok.Data;
import lombok.NoArgsConstructor; // Added for clarity, though @Data usually adds it

/**
 * DTO for incoming journal entry creation requests from the frontend.
 */
@Data
@NoArgsConstructor // Ensure a no-argument constructor is present for Jackson deserialization
public class JournalEntryRequest {
    // ⭐ MODIFIED: Renamed 'text' to 'rawText' to match frontend payload ⭐
    private String rawText;

    // You might still want a constructor if you manually create these DTOs for testing
    public JournalEntryRequest(String rawText) {
        this.rawText = rawText;
    }
}
