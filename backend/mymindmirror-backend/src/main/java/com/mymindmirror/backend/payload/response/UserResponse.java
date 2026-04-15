package com.mymindmirror.backend.payload.response;

import com.mymindmirror.backend.model.User;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

/**
 * DTO for user details included in responses, e.g., nested in JournalEntryResponse.
 * Only expose non-sensitive user information to the frontend.
 */
@Data
@NoArgsConstructor
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    // Do NOT include passwordHash or any other sensitive internal fields here.

    /**
     * Constructor to map fields from the User entity to the UserResponse DTO.
     * @param user The User entity from which to create the response DTO.
     */
    public UserResponse(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
    }
}