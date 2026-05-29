package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.ApiKeyStatusResponse;
import com.mymindmirror.backend.util.FieldEncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final FieldEncryptionUtil encryptionUtil;
    private final UserService userService;

    /**
     * Retrieves the decrypted Gemini API key for the given user.
     * @return the plain API key, or null if not set.
     */
    public String getDecryptedApiKey(User user) {
        if (user.getGeminiApiKeyEncrypted() == null) {
            return null;
        }
        return encryptionUtil.decrypt(user.getGeminiApiKeyEncrypted());
    }

    /**
     * Encrypts and stores the Gemini API key for the user.
     */

    @Caching(evict = {
            @CacheEvict(value = "apiKeyStatus", key = "#user.id"),
            @CacheEvict(value = "userFullProfile", key = "#user.id")
    })
    public void saveApiKey(User user, String plainApiKey) {

        if (plainApiKey == null || plainApiKey.isBlank()) {
            user.setGeminiApiKeyEncrypted(null);
        } else {
            user.setGeminiApiKeyEncrypted(encryptionUtil.encrypt(plainApiKey));
        }

        userService.save(user);
    }

    @Cacheable(value = "apiKeyStatus", key = "#user.id")
    public ApiKeyStatusResponse getApiKeyStatus(User user) {
        String decrypted = getDecryptedApiKey(user);
        boolean usingOwnKey = decrypted != null && !decrypted.isBlank();
        String masked = null;
        if (usingOwnKey) {
            int len = decrypted.length();
            masked = "••••••••" + decrypted.substring(Math.max(0, len - 4));
        }
        String message = usingOwnKey
                ? "Using your own Gemini API key."
                : "Using shared API key. For better privacy, add your own key.";
        return new ApiKeyStatusResponse(usingOwnKey, masked, message);
    }

}