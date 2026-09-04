package com.mymindmirror.backend.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthRequest(
        @NotBlank(message = "Username is required") String username,
        @Email(message = "Email should be valid") String email, // Only required for registration
        @NotBlank(message = "Password is required") String password
) {}