package com.mymindmirror.backend.integration;

import com.mymindmirror.backend.payload.request.AuthRequest;
import com.mymindmirror.backend.payload.response.AuthResponse;
import com.mymindmirror.backend.payload.request.JournalEntryRequest;
import com.mymindmirror.backend.payload.response.JournalEntryResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JournalIntegrationTest extends BaseIntegrationTest {

    private String authToken;
    private String testUsername;
    private String testEmail;
    private final String testPassword = "password123";

    @BeforeEach
    void setUp() {
        // Generate unique user for each test to avoid conflicts
        long timestamp = System.currentTimeMillis();
        testUsername = "journaluser_" + timestamp;
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
    void createJournalEntry_ShouldReturnCreated() {
        JournalEntryRequest request = new JournalEntryRequest("Test journal entry content.");
        HttpEntity<JournalEntryRequest> entity = new HttpEntity<>(request, createAuthHeaders(authToken));

        ResponseEntity<JournalEntryResponse> response = restTemplate.exchange(
                getBaseUrl() + "/journal", HttpMethod.POST, entity, JournalEntryResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isNotNull();
        // rawText is encrypted, so we don't compare it
    }

    @Test
    void getJournalHistory_ShouldReturnEntries() {
        // First create an entry
        JournalEntryRequest createRequest = new JournalEntryRequest("Entry for history test");
        HttpEntity<JournalEntryRequest> createEntity = new HttpEntity<>(createRequest, createAuthHeaders(authToken));
        ResponseEntity<JournalEntryResponse> createResponse = restTemplate.exchange(
                getBaseUrl() + "/journal", HttpMethod.POST, createEntity, JournalEntryResponse.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID createdId = createResponse.getBody().getId();

        // Then fetch history
        HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders(authToken));
        ResponseEntity<List<JournalEntryResponse>> response = restTemplate.exchange(
                getBaseUrl() + "/journal/history", HttpMethod.GET, entity,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotEmpty();
        boolean found = response.getBody().stream().anyMatch(e -> e.getId().equals(createdId));
        assertThat(found).isTrue();
    }

    @Test
    void updateJournalEntry_ShouldUpdateContent() {
        // Create entry
        JournalEntryRequest createRequest = new JournalEntryRequest("Original text");
        HttpEntity<JournalEntryRequest> createEntity = new HttpEntity<>(createRequest, createAuthHeaders(authToken));
        ResponseEntity<JournalEntryResponse> createResponse = restTemplate.exchange(
                getBaseUrl() + "/journal", HttpMethod.POST, createEntity, JournalEntryResponse.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String entryId = createResponse.getBody().getId().toString();

        // Update entry
        JournalEntryRequest updateRequest = new JournalEntryRequest("Updated text");
        HttpEntity<JournalEntryRequest> updateEntity = new HttpEntity<>(updateRequest, createAuthHeaders(authToken));
        ResponseEntity<JournalEntryResponse> updateResponse = restTemplate.exchange(
                getBaseUrl() + "/journal/" + entryId, HttpMethod.PUT, updateEntity, JournalEntryResponse.class);

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody().getId().toString()).isEqualTo(entryId);
    }

    @Test
    void deleteJournalEntry_ShouldReturnNoContent() {
        // Create entry
        JournalEntryRequest createRequest = new JournalEntryRequest("To be deleted");
        HttpEntity<JournalEntryRequest> createEntity = new HttpEntity<>(createRequest, createAuthHeaders(authToken));
        ResponseEntity<JournalEntryResponse> createResponse = restTemplate.exchange(
                getBaseUrl() + "/journal", HttpMethod.POST, createEntity, JournalEntryResponse.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String entryId = createResponse.getBody().getId().toString();

        // Delete entry
        HttpEntity<Void> deleteEntity = new HttpEntity<>(createAuthHeaders(authToken));
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                getBaseUrl() + "/journal/" + entryId, HttpMethod.DELETE, deleteEntity, Void.class);

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Verify it's gone
        ResponseEntity<JournalEntryResponse> getResponse = restTemplate.exchange(
                getBaseUrl() + "/journal/" + entryId, HttpMethod.GET, deleteEntity, JournalEntryResponse.class);
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}