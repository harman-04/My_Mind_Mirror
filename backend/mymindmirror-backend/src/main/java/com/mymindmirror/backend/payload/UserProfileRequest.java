package com.mymindmirror.backend.payload;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * DTO for updating user profile information.
 * Only non-null fields will be considered for update.
 */
@Data
public class UserProfileRequest {
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    // Password change is usually handled separately for security reasons,
    // but can be added here if you want a single endpoint for all updates.
    // For now, we'll omit it for simplicity and security best practices.
    // private String newPassword;
}
