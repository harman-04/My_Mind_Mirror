package com.mymindmirror.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ApiKeyRequest;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApiKeyController.class)
@Import(ApiKeyControllerTest.TestSecurityConfig.class)
class ApiKeyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ApiKeyService apiKeyService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtil jwtUtil;

    private User testUser;
    private final UUID userId = UUID.randomUUID();

    // Disable CSRF for tests
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable());
            return http.build();
        }
    }

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
    }

    @Test
    @WithMockUser(username = "testuser")
    void getApiKeyMasked_WhenUserHasKey_ShouldReturnMaskedKey() throws Exception {
        String apiKey = "AIzaSyDummyKey1234567890";
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(apiKey);

        mockMvc.perform(get("/api/users/api-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maskedKey").value("••••••••7890"))
                .andExpect(jsonPath("$.set").value(true));   // field name is "set", not "isSet"
    }

    @Test
    @WithMockUser(username = "testuser")
    void getApiKeyMasked_WhenUserHasNoKey_ShouldReturnNullMaskedAndIsSetFalse() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(null);

        mockMvc.perform(get("/api/users/api-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maskedKey").isEmpty())
                .andExpect(jsonPath("$.set").value(false));
    }

    @Test
    @WithMockUser(username = "testuser")
    void getApiKeyMasked_WhenUserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/api-key"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "testuser")
    void updateApiKey_WithValidKey_ShouldSaveAndReturnNoContent() throws Exception {
        ApiKeyRequest request = new ApiKeyRequest();
        request.setApiKey("new-valid-key-12345");

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        mockMvc.perform(put("/api/users/api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(apiKeyService).saveApiKey(testUser, "new-valid-key-12345");
    }

    @Test
    @WithMockUser(username = "testuser")
    void updateApiKey_WithNullKey_ShouldClearKey() throws Exception {
        ApiKeyRequest request = new ApiKeyRequest();
        request.setApiKey(null);

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        mockMvc.perform(put("/api/users/api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(apiKeyService).saveApiKey(testUser, null);
    }

    @Test
    @WithMockUser(username = "testuser")
    void updateApiKey_WithBlankKey_ShouldClearKey() throws Exception {
        ApiKeyRequest request = new ApiKeyRequest();
        request.setApiKey("   ");

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        mockMvc.perform(put("/api/users/api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(apiKeyService).saveApiKey(testUser, null);
    }

    @Test
    @WithMockUser(username = "testuser")
    void updateApiKey_WhenUserNotFound_ShouldReturnUnauthorized() throws Exception {
        ApiKeyRequest request = new ApiKeyRequest();
        request.setApiKey("some-key");

        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/users/api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(apiKeyService, never()).saveApiKey(any(), any());
    }

    @Test
    @WithMockUser(username = "testuser")
    void getApiKeyStatus_WhenUserHasKey_ShouldReturnUsingOwnKeyTrue() throws Exception {
        String apiKey = "AIzaSyDummyKey1234567890";
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(apiKey);

        mockMvc.perform(get("/api/users/api-key/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usingOwnKey").value(true))
                .andExpect(jsonPath("$.maskedKey").value("••••••••7890"))
                .andExpect(jsonPath("$.message").value("Using your own Gemini API key."));
    }

    @Test
    @WithMockUser(username = "testuser")
    void getApiKeyStatus_WhenUserHasNoKey_ShouldReturnUsingOwnKeyFalse() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(null);

        mockMvc.perform(get("/api/users/api-key/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usingOwnKey").value(false))
                .andExpect(jsonPath("$.maskedKey").isEmpty())
                .andExpect(jsonPath("$.message").value("Using shared API key. For better privacy, add your own key."));
    }

    @Test
    @WithMockUser(username = "testuser")
    void getApiKeyStatus_WhenUserNotFound_ShouldReturnUnauthorized() throws Exception {
        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/api-key/status"))
                .andExpect(status().isUnauthorized());
    }
}