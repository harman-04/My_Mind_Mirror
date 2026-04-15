package com.mymindmirror.backend.payload.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for incoming journal entry creation requests from the frontend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JournalEntryRequest {
    private String rawText;
}
