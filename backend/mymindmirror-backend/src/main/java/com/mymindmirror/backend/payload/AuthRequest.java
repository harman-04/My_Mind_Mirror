// AuthRequest.java
package com.mymindmirror.backend.payload;

import lombok.Data;

/**
 * DTO for authentication requests (login and registration).
 */
@Data // Lombok annotation for getters, setters, equals, hashCode, toString
public class AuthRequest {
    private String username;
    private String email; // Only required for registration
    private String password;
}