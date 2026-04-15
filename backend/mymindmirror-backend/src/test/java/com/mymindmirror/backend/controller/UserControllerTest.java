package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ChangePasswordRequest;
import com.mymindmirror.backend.payload.request.UserProfileRequest;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(UserControllerTest.TestSecurityConfig.class)
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private final UUID userId = UUID.randomUUID();
    private final String validToken = "valid.jwt.token";
    private final String authHeader = "Bearer " + validToken;

    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable());
            return http.build();
        }
    }

    @BeforeEach
    void setUp() {
        // Mock JwtUtil to return the fixed userId when the valid token is passed
        when(jwtUtil.extractUserId(validToken)).thenReturn(userId);
    }

    // -------------------- GET /profile --------------------
    @Test
    void getUserProfile_ShouldReturnOk_WhenUserExists() throws Exception {
        User user = new User();
        user.setId(userId);
        user.setUsername("testuser");
        user.setEmail("test@example.com");

        when(userService.findById(userId)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/users/profile")
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void getUserProfile_ShouldReturnNotFound_WhenUserDoesNotExist() throws Exception {
        when(userService.findById(userId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/profile")
                        .header("Authorization", authHeader))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User profile not found."));
    }

    @Test
    void getUserProfile_ShouldReturnUnauthorized_WhenTokenInvalid() throws Exception {
        // Simulate JwtUtil throwing SecurityException (e.g., invalid token)
        when(jwtUtil.extractUserId(any())).thenThrow(new SecurityException("Invalid token"));

        mockMvc.perform(get("/api/users/profile")
                        .header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Invalid token"));
    }

    @Test
    void getUserProfile_ShouldReturnUnauthorized_WhenNoAuthHeader() throws Exception {
        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Authorization header missing or invalid."));
    }

    // -------------------- PUT /profile --------------------
    @Test
    void updateUserProfile_ShouldReturnOk_WhenValidRequest() throws Exception {
        UserProfileRequest request = new UserProfileRequest();
        request.setUsername("newusername");
        request.setEmail("new@example.com");

        User updatedUser = new User();
        updatedUser.setId(userId);
        updatedUser.setUsername("newusername");
        updatedUser.setEmail("new@example.com");

        when(userService.updateUser(eq(userId), any(UserProfileRequest.class))).thenReturn(updatedUser);

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("newusername"))
                .andExpect(jsonPath("$.email").value("new@example.com"));
    }

    @Test
    void updateUserProfile_ShouldReturnBadRequest_WhenValidationFails() throws Exception {
        UserProfileRequest request = new UserProfileRequest();
        request.setUsername("ab"); // too short
        request.setEmail("invalid-email");

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateUserProfile_ShouldReturnBadRequest_WhenUserServiceThrowsIllegalArgumentException() throws Exception {
        UserProfileRequest request = new UserProfileRequest();
        request.setUsername("taken");

        when(userService.updateUser(eq(userId), any(UserProfileRequest.class)))
                .thenThrow(new IllegalArgumentException("Username already taken."));

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Username already taken."));
    }

    @Test
    void updateUserProfile_ShouldReturnUnauthorized_WhenInvalidToken() throws Exception {
        when(jwtUtil.extractUserId(any())).thenThrow(new SecurityException("Invalid token"));

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", "Bearer invalid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UserProfileRequest())))
                .andExpect(status().isUnauthorized());
    }

    // -------------------- DELETE /profile --------------------
    @Test
    void deleteUserProfile_ShouldReturnOk_WhenUserExists() throws Exception {
        doNothing().when(userService).deleteUser(userId);

        mockMvc.perform(delete("/api/users/profile")
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(content().string("User profile deleted successfully."));
    }

    @Test
    void deleteUserProfile_ShouldReturnNotFound_WhenUserDoesNotExist() throws Exception {
        doThrow(new IllegalArgumentException("User not found.")).when(userService).deleteUser(userId);

        mockMvc.perform(delete("/api/users/profile")
                        .header("Authorization", authHeader))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User not found."));
    }

    @Test
    void deleteUserProfile_ShouldReturnUnauthorized_WhenNoAuthHeader() throws Exception {
        mockMvc.perform(delete("/api/users/profile"))
                .andExpect(status().isUnauthorized());
    }

    // -------------------- PUT /profile/password --------------------
    @Test
    void changePassword_ShouldReturnOk_WhenValidRequest() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPass");
        request.setNewPassword("newPass123");

        doNothing().when(userService).changeUserPassword(userId, "oldPass", "newPass123");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Password changed successfully."));
    }

    @Test
    void changePassword_ShouldReturnBadRequest_WhenValidationFails() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old");
        request.setNewPassword("new"); // too short (min 6)

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_ShouldReturnBadRequest_WhenCurrentPasswordIncorrect() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrong");
        request.setNewPassword("newPass123");

        doThrow(new IllegalArgumentException("Incorrect current password."))
                .when(userService).changeUserPassword(userId, "wrong", "newPass123");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Incorrect current password."));
    }

    @Test
    void changePassword_ShouldReturnBadRequest_WhenNewPasswordSameAsOld() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPass123");
        request.setNewPassword("samePass123");
                request.setCurrentPassword("validOld");
        request.setNewPassword("validOld");

        doThrow(new IllegalArgumentException("New password cannot be the same as the old password."))
                .when(userService).changeUserPassword(userId, "validOld", "validOld");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("New password cannot be the same as the old password."));
    }

    // -------------------- Additional coverage for changePassword --------------------
    @Test
    void changePassword_ShouldReturnUnauthorized_WhenInvalidToken() throws Exception {
        // Simulate JwtUtil throwing SecurityException (invalid token)
        when(jwtUtil.extractUserId(any())).thenThrow(new SecurityException("Invalid token"));

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old");
        request.setNewPassword("newPass123");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", "Bearer invalid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Invalid token"));
    }

    @Test
    void changePassword_ShouldReturnInternalServerError_WhenUnexpectedException() throws Exception {
        // Simulate an unexpected runtime exception (e.g., NullPointerException)
        doThrow(new NullPointerException("Something went wrong"))
                .when(userService).changeUserPassword(eq(userId), anyString(), anyString());

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old");
        request.setNewPassword("newPass123");

        mockMvc.perform(put("/api/users/profile/password")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Failed to change password due to an internal error."));
    }

    @Test
    void changePassword_ShouldReturnUnauthorized_WhenNoAuthHeader() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old");
        request.setNewPassword("newPass123");

        mockMvc.perform(put("/api/users/profile/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Authorization header missing or invalid."));
    }

    // -------------------- Additional coverage for updateUserProfile --------------------
    @Test
    void updateUserProfile_ShouldReturnInternalServerError_WhenUnexpectedException() throws Exception {
        UserProfileRequest request = new UserProfileRequest();
        request.setUsername("newusername");
        request.setEmail("new@example.com");

        when(userService.updateUser(eq(userId), any(UserProfileRequest.class)))
                .thenThrow(new RuntimeException("Unexpected DB error"));

        mockMvc.perform(put("/api/users/profile")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Failed to update user profile due to an internal error."));
    }

    // -------------------- Additional coverage for deleteUserProfile --------------------
    @Test
    void deleteUserProfile_ShouldReturnInternalServerError_WhenUnexpectedException() throws Exception {
        doThrow(new RuntimeException("Unexpected error")).when(userService).deleteUser(userId);

        mockMvc.perform(delete("/api/users/profile")
                        .header("Authorization", authHeader))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Failed to delete user profile due to an internal error."));
    }

    // -------------------- Additional coverage for getUserProfile (already covered, but add one for 500) --------------------
    @Test
    void getUserProfile_ShouldReturnInternalServerError_WhenUnexpectedException() throws Exception {
        when(userService.findById(userId)).thenThrow(new RuntimeException("DB failure"));

        mockMvc.perform(get("/api/users/profile")
                        .header("Authorization", authHeader))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Failed to retrieve user profile due to an internal error."));
    }
}