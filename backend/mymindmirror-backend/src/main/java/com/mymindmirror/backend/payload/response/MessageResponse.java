// src/main/java/com/mymindmirror.backend/payload/response/MessageResponse.java
package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Generic DTO for sending simple messages (e.g., success, error) in API responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private String message;
}
