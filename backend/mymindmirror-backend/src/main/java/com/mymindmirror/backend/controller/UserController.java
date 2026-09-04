package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.annotation.CurrentUser;
import com.mymindmirror.backend.mapper.UserMapper;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ChangePasswordRequest;
import com.mymindmirror.backend.payload.request.UpdateRoadmapPreferencesRequest;
import com.mymindmirror.backend.payload.request.UpdateUserPreferencesRequest;
import com.mymindmirror.backend.payload.request.UserProfileRequest;
import com.mymindmirror.backend.payload.response.*;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final ApiKeyService apiKeyService;
    private final UserMapper userMapper;

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateUserProfile(
            @CurrentUser User currentUser,
            @Valid @RequestBody UserProfileRequest request) {

        User updatedUser = userService.updateUser(currentUser.getId(), request);
        return ResponseEntity.ok(userMapper.toProfileResponse(updatedUser));
    }

    @DeleteMapping("/profile")
    public ResponseEntity<MessageResponse> deleteUserProfile(@CurrentUser User currentUser) {
        userService.deleteUser(currentUser.getId());
        return ResponseEntity.ok(new MessageResponse("User profile deleted successfully."));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<MessageResponse> changePassword(
            @CurrentUser User currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {

        userService.changeUserPassword(
                currentUser.getId(),
                request.currentPassword(),
                request.newPassword()
        );
        return ResponseEntity.ok(new MessageResponse("Password changed successfully."));
    }


    @PutMapping("/roadmap-preferences")
    public ResponseEntity<UserRoadmapPreferencesDto> updateRoadmapPreferences(
            @CurrentUser User currentUser,
            @Valid @RequestBody UpdateRoadmapPreferencesRequest request) {

        // ✅ Pass typed DTO directly – service handles it
        UserRoadmapPreferencesDto response = userService.updateRoadmapPreferences(currentUser, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile-full")
    public ResponseEntity<UserFullProfileResponse> getUserFullProfile(@CurrentUser User currentUser) {
        String decryptedKey = apiKeyService.getDecryptedApiKey(currentUser);
        UserFullProfileResponse response = userService.getFullUserProfile(currentUser, decryptedKey);
        return ResponseEntity.ok(response);
    }



    @PutMapping("/preferences")
    public ResponseEntity<UserPreferencesResponse> updateUserPreferences(
            @CurrentUser User currentUser,
            @Valid @RequestBody UpdateUserPreferencesRequest request) {

        // ✅ DTO fields are already LocalTime, LocalDate – pass directly
        UserPreferencesResponse response = userService.updateUserPreferences(currentUser, request);
        return ResponseEntity.ok(response);
    }
}