package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ChangePasswordRequest;
import com.mymindmirror.backend.payload.request.UserProfileRequest;
import com.mymindmirror.backend.payload.response.UserProfileResponse;
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.UUID;
import java.util.Optional;

/**
 * REST Controller for user profile management (view, update, delete, change password).
 * All endpoints require authentication.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;


    private UUID getUserIdFromRequest(HttpServletRequest request) {
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String jwt = authorizationHeader.substring(7);
            return jwtUtil.extractUserId(jwt);
        }
        throw new SecurityException("Authorization header missing or invalid.");
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(HttpServletRequest request) {
        try {
            UUID userId = getUserIdFromRequest(request);
            log.info("Attempting to retrieve profile for user ID: {}", userId);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                UserProfileResponse response = new UserProfileResponse(user.getId(), user.getUsername(), user.getEmail());
                log.info("Profile retrieved successfully for user ID: {}", userId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("User profile not found for ID: {}", userId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User profile not found.");
            }
        } catch (SecurityException e) {
            log.error("Security error during profile retrieval: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) {
            log.error("An unexpected error occurred while retrieving user profile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to retrieve user profile due to an internal error.");
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(
            HttpServletRequest request,
            @Valid @RequestBody UserProfileRequest userProfileRequest) {
        try {
            UUID userId = getUserIdFromRequest(request);
            log.info("Attempting to update profile for user ID: {}", userId);

            User updatedUser = userService.updateUser(userId, userProfileRequest);
            UserProfileResponse response = new UserProfileResponse(updatedUser.getId(), updatedUser.getUsername(), updatedUser.getEmail());
            log.info("Profile updated successfully for user ID: {}", userId);
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            log.error("Security error during profile update: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Profile update failed for user ID {}: {}", getUserIdFromRequest(request), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("An unexpected error occurred while updating user profile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update user profile due to an internal error.");
        }
    }

    @DeleteMapping("/profile")
    public ResponseEntity<?> deleteUserProfile(HttpServletRequest request) {
        try {
            UUID userId = getUserIdFromRequest(request);
            log.info("Attempting to delete profile for user ID: {}", userId);

            userService.deleteUser(userId);
            log.info("Profile deleted successfully for user ID: {}", userId);
            return ResponseEntity.ok("User profile deleted successfully.");
        } catch (SecurityException e) {
            log.error("Security error during profile deletion: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Profile deletion failed for user ID {}: {}", getUserIdFromRequest(request), e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("An unexpected error occurred while deleting user profile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to delete user profile due to an internal error.");
        }
    }

    /**
     * Handles requests to change the authenticated user's password.
     * @param request HttpServletRequest to extract JWT and user ID.
     * @param changePasswordRequest DTO containing current and new passwords.
     * @return ResponseEntity with success message or error.
     */
    @PutMapping("/profile/password")
    public ResponseEntity<?> changePassword(
            HttpServletRequest request,
            @Valid @RequestBody ChangePasswordRequest changePasswordRequest) {
        try {
            UUID userId = getUserIdFromRequest(request);
            log.info("Attempting to change password for user ID: {}", userId);

            userService.changeUserPassword(
                    userId,
                    changePasswordRequest.getCurrentPassword(),
                    changePasswordRequest.getNewPassword()
            );
            log.info("Password changed successfully for user ID: {}", userId);
            return ResponseEntity.ok("Password changed successfully.");
        } catch (SecurityException e) {
            log.error("Security error during password change: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Password change failed for user ID {}: {}", getUserIdFromRequest(request), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("An unexpected error occurred while changing password: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to change password due to an internal error.");
        }
    }
}
