package com.mymindmirror.backend.integration;

import com.mymindmirror.backend.payload.request.AuthRequest;
import com.mymindmirror.backend.payload.response.AuthResponse;
import com.mymindmirror.backend.payload.request.RoadmapGenerateRequest;
import com.mymindmirror.backend.payload.response.RoadmapResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RoadmapIntegrationTest extends BaseIntegrationTest {

    private String authToken;
    private String testUsername;
    private String testEmail;
    private final String testPassword = "password123";

    @BeforeEach
    void setUp() {
        long timestamp = System.currentTimeMillis();
        testUsername = "roadmapuser_" + timestamp;
        testEmail = testUsername + "@test.com";

        // Register user
        AuthRequest registerRequest = new AuthRequest();
        registerRequest.setUsername(testUsername);
        registerRequest.setEmail(testEmail);
        registerRequest.setPassword(testPassword);
        ResponseEntity<AuthResponse> registerResponse = restTemplate.postForEntity(
                getBaseUrl() + "/auth/register", registerRequest, AuthResponse.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Login
        AuthRequest loginRequest = new AuthRequest();
        loginRequest.setUsername(testUsername);
        loginRequest.setPassword(testPassword);
        ResponseEntity<AuthResponse> loginResponse = restTemplate.postForEntity(
                getBaseUrl() + "/auth/login", loginRequest, AuthResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        authToken = loginResponse.getBody().getToken();
    }

    @Test
    void generateRoadmap_ShouldReturnRoadmapWithFallback() {
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal("Learn Java");
        request.setTimeframeWeeks(4);

        HttpEntity<RoadmapGenerateRequest> entity = new HttpEntity<>(request, createAuthHeaders(authToken));
        ResponseEntity<RoadmapResponse> response = restTemplate.exchange(
                getBaseUrl() + "/roadmap/generate", HttpMethod.POST, entity, RoadmapResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).contains("Your Personalized Roadmap");
        assertThat(response.getBody().getTasks()).isNotEmpty();
    }

    @Test
    void getUserRoadmaps_ShouldReturnList() {
        // First generate a roadmap
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal("Learn Java");
        HttpEntity<RoadmapGenerateRequest> generateEntity = new HttpEntity<>(request, createAuthHeaders(authToken));
        ResponseEntity<RoadmapResponse> generateResponse = restTemplate.exchange(
                getBaseUrl() + "/roadmap/generate", HttpMethod.POST, generateEntity, RoadmapResponse.class);
        assertThat(generateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID roadmapId = generateResponse.getBody().getId();

        // Then fetch all roadmaps
        HttpEntity<Void> getEntity = new HttpEntity<>(createAuthHeaders(authToken));
        ResponseEntity<List<RoadmapResponse>> getResponse = restTemplate.exchange(
                getBaseUrl() + "/roadmap", HttpMethod.GET, getEntity,
                new ParameterizedTypeReference<>() {});

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody()).isNotEmpty();
        boolean found = getResponse.getBody().stream().anyMatch(r -> r.getId().equals(roadmapId));
        assertThat(found).isTrue();
    }

    @Test
    void deleteRoadmap_ShouldRemoveIt() {
        // Generate roadmap
        RoadmapGenerateRequest request = new RoadmapGenerateRequest();
        request.setGoal("Learn Java");
        HttpEntity<RoadmapGenerateRequest> generateEntity = new HttpEntity<>(request, createAuthHeaders(authToken));
        ResponseEntity<RoadmapResponse> generateResponse = restTemplate.exchange(
                getBaseUrl() + "/roadmap/generate", HttpMethod.POST, generateEntity, RoadmapResponse.class);
        UUID roadmapId = generateResponse.getBody().getId();

        // Delete
        HttpEntity<Void> deleteEntity = new HttpEntity<>(createAuthHeaders(authToken));
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                getBaseUrl() + "/roadmap/" + roadmapId, HttpMethod.DELETE, deleteEntity, Void.class);
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Verify it's gone
        ResponseEntity<List<RoadmapResponse>> getResponse = restTemplate.exchange(
                getBaseUrl() + "/roadmap", HttpMethod.GET, deleteEntity,
                new ParameterizedTypeReference<>() {});
        boolean found = getResponse.getBody().stream().anyMatch(r -> r.getId().equals(roadmapId));
        assertThat(found).isFalse();
    }
}