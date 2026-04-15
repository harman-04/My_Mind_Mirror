package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ApiKeyRequest;
import com.mymindmirror.backend.payload.response.ApiKeyResponse;
import com.mymindmirror.backend.payload.response.ApiKeyStatusResponse;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final UserService userService;

    /**
     * Get masked Gemini API key for the authenticated user.
     * Returns e.g. "••••••••1234" if set, otherwise null.
     */
    @GetMapping("/api-key")
    public ResponseEntity<ApiKeyResponse> getApiKeyMasked(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        User user = userOpt.get();
        String decrypted = apiKeyService.getDecryptedApiKey(user);
        String masked = null;
        if (decrypted != null && !decrypted.isBlank()) {
            int len = decrypted.length();
            masked = "••••••••" + decrypted.substring(Math.max(0, len - 4));
        }
        return ResponseEntity.ok(new ApiKeyResponse(masked, decrypted != null && !decrypted.isBlank()));
    }

    /**
     * Update Gemini API key for the authenticated user.
     */
    @PutMapping("/api-key")
    public ResponseEntity<Void> updateApiKey(@AuthenticationPrincipal UserDetails userDetails,
                                             @RequestBody ApiKeyRequest request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        User user = userOpt.get();
        String newKey = request.getApiKey();
        if (newKey == null || newKey.isBlank()) {
            // Clear the key
            apiKeyService.saveApiKey(user, null);
            log.info("Cleared API key for user {}", user.getUsername());
        } else {
            apiKeyService.saveApiKey(user, newKey);
            log.info("Updated API key for user {}", user.getUsername());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api-key/status")
    public ResponseEntity<ApiKeyStatusResponse> getApiKeyStatus(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        User user = userOpt.get();
        String decrypted = apiKeyService.getDecryptedApiKey(user);
        boolean usingOwnKey = decrypted != null && !decrypted.isBlank();
        String masked = null;
        if (usingOwnKey) {
            int len = decrypted.length();
            masked = "••••••••" + decrypted.substring(Math.max(0, len - 4));
        }
        String message = usingOwnKey
                ? "Using your own Gemini API key."
                : "Using shared API key. For better privacy, add your own key.";
        return ResponseEntity.ok(new ApiKeyStatusResponse(usingOwnKey, masked, message));
    }
}