package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ApiKeyRequest;
import com.mymindmirror.backend.payload.response.ApiKeyResponse;
import com.mymindmirror.backend.payload.response.ApiKeyStatusResponse;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.service.ai.DynamicAiClientService;
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
    private final DynamicAiClientService dynamicAiClientService;

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

        //  Evict the old AI client from memory so the new key takes effect instantly
        dynamicAiClientService.evictUserModel(user.getId());

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api-key/status")
    public ResponseEntity<ApiKeyStatusResponse> getApiKeyStatus(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        User user = userOpt.get();
        ApiKeyStatusResponse response = apiKeyService.getApiKeyStatus(user);
        return ResponseEntity.ok(response);
    }
}