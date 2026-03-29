package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.util.FieldEncryptionUtil;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ApiKeyService {

    private final FieldEncryptionUtil encryptionUtil;
    private final UserService userService;

    public ApiKeyService(FieldEncryptionUtil encryptionUtil, UserService userService) {
        this.encryptionUtil = encryptionUtil;
        this.userService = userService;
    }

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
    public void saveApiKey(User user, String plainApiKey) {
        if (plainApiKey == null || plainApiKey.isBlank()) {
            user.setGeminiApiKeyEncrypted(null);
        } else {
            user.setGeminiApiKeyEncrypted(encryptionUtil.encrypt(plainApiKey));
        }
        userService.save(user); // you'll need to add a save method to UserService
    }
}