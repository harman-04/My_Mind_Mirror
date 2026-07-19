package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserPreferences;
import com.mymindmirror.backend.model.UserRoadmapPreferences;
import com.mymindmirror.backend.payload.request.ChangePasswordRequest;
import com.mymindmirror.backend.payload.request.UserProfileRequest;
import com.mymindmirror.backend.payload.response.UserFullProfileResponse;
import com.mymindmirror.backend.payload.response.UserPreferencesResponse;
import com.mymindmirror.backend.payload.response.UserProfileResponse;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.Map;
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
    private final ApiKeyService apiKeyService;


    private UUID getUserIdFromRequest(HttpServletRequest request) {
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String jwt = authorizationHeader.substring(7);
            return jwtUtil.extractUserId(jwt);
        }
        throw new SecurityException("Authorization header missing or invalid.");
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



    @PutMapping("/roadmap-preferences")
    public ResponseEntity<?> updateRoadmapPreferences(
            HttpServletRequest request,
            @RequestBody Map<String, Object> updates) {
        try {
            UUID userId = getUserIdFromRequest(request);
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            // Safely extract values with type checking
            String difficulty = updates.get("difficulty") instanceof String ? (String) updates.get("difficulty") : null;
            String languagePreference = updates.get("languagePreference") instanceof String ? (String) updates.get("languagePreference") : null;
            String learningStyle = updates.get("learningStyle") instanceof String ? (String) updates.get("learningStyle") : null;

            Integer hoursPerWeek = null;
            if (updates.containsKey("hoursPerWeek")) {
                Object hoursObj = updates.get("hoursPerWeek");
                if (hoursObj instanceof Number) {
                    hoursPerWeek = ((Number) hoursObj).intValue();
                } else if (hoursObj instanceof String) {
                    try {
                        hoursPerWeek = Integer.parseInt((String) hoursObj);
                    } catch (NumberFormatException ignored) {}
                }
            }

            Boolean avoidWeekends = null;
            if (updates.containsKey("avoidWeekends")) {
                Object avoidObj = updates.get("avoidWeekends");
                if (avoidObj instanceof Boolean) {
                    avoidWeekends = (Boolean) avoidObj;
                } else if (avoidObj instanceof String) {
                    avoidWeekends = Boolean.parseBoolean((String) avoidObj);
                }
            }

            UserRoadmapPreferences updated = userService.updateRoadmapPreferences(
                    user, difficulty, languagePreference, learningStyle, hoursPerWeek, avoidWeekends);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating roadmap preferences for user", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/profile-full")
    public ResponseEntity<?> getUserFullProfile(HttpServletRequest request) {
        try {
            UUID userId = getUserIdFromRequest(request);
            log.info("Fetching full profile for user ID: {}", userId);

            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            String decryptedKey = apiKeyService.getDecryptedApiKey(user);
            UserFullProfileResponse response = userService.getFullUserProfile(user, decryptedKey);

            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            log.error("Security error during full profile retrieval: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error retrieving full profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to retrieve full profile due to an internal error.");
        }
    }

    @PutMapping("/preferences")
    public ResponseEntity<UserPreferencesResponse> updateUserPreferences(@AuthenticationPrincipal UserDetails userDetails,
                                                                         @RequestBody Map<String, Object> request) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserPreferences updated = userService.updateUserPreferences(user, request);

        UserPreferencesResponse response = new UserPreferencesResponse(
                updated.getAvailableHoursJson(),
                updated.getTimezone(),
                updated.getEnergyPeak(),
                updated.getWakeTime().toString(),
                updated.getSleepTime().toString(),
                updated.getLunchTime().toString(),
                updated.getDailyHabitsJson()
        );
        return ResponseEntity.ok(response);
    }
}
