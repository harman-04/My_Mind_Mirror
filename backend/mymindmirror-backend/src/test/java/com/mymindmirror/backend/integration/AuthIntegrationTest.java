package com.mymindmirror.backend.integration;

import com.mymindmirror.backend.payload.request.AuthRequest;
import com.mymindmirror.backend.payload.response.AuthResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends BaseIntegrationTest {

    @Test
    void registerAndLogin_ShouldSucceed() {
        long timestamp = System.currentTimeMillis();
        String username = "integrationuser_" + timestamp;
        String email = username + "@test.com";
        String password = "password123";

        // Register
        AuthRequest registerRequest = new AuthRequest();
        registerRequest.setUsername(username);
        registerRequest.setEmail(email);
        registerRequest.setPassword(password);
        ResponseEntity<AuthResponse> registerResponse = restTemplate.postForEntity(
                getBaseUrl() + "/auth/register", registerRequest, AuthResponse.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody().getMessage()).contains("successfully");

        // Login
        AuthRequest loginRequest = new AuthRequest();
        loginRequest.setUsername(username);
        loginRequest.setPassword(password);
        ResponseEntity<AuthResponse> loginResponse = restTemplate.postForEntity(
                getBaseUrl() + "/auth/login", loginRequest, AuthResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody().getToken()).isNotBlank();
    }

    @Test
    void loginWithInvalidCredentials_ShouldReturnUnauthorized() {
        AuthRequest loginRequest = new AuthRequest();
        loginRequest.setUsername("nonexistent");
        loginRequest.setPassword("wrong");
        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                getBaseUrl() + "/auth/login", loginRequest, AuthResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}