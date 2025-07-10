// AuthResponse.java
package com.mymindmirror.backend.payload;

import lombok.AllArgsConstructor; // Lombok for all-args constructor
import lombok.Data;
import lombok.NoArgsConstructor; // Lombok for no-args constructor

/**
 * DTO for authentication responses (returning JWT token).
 */
@Data // Lombok annotation for getters, setters, equals, hashCode, toString
@AllArgsConstructor // Generates a constructor with all fields
@NoArgsConstructor // Generates a no-argument constructor
public class AuthResponse {
    private String token;
    private String message;

    // Constructor for registration success (no token)
    public AuthResponse(String message) {
        this.message = message;
    }
}
