package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.util.FieldEncryptionUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApiKeyServiceTest {

    @Mock
    private FieldEncryptionUtil encryptionUtil;

    @Mock
    private UserService userService;

    @InjectMocks
    private ApiKeyService apiKeyService;

    private User testUser;
    private final String PLAIN_KEY = "test-api-key-12345";
    private final String ENCRYPTED_KEY = "encrypted:test-api-key-12345";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(java.util.UUID.randomUUID());
        testUser.setUsername("testuser");
    }

    @Test
    void getDecryptedApiKey_WhenNoEncryptedKey_ShouldReturnNull() {
        testUser.setGeminiApiKeyEncrypted(null);
        String result = apiKeyService.getDecryptedApiKey(testUser);
        assertThat(result).isNull();
        verify(encryptionUtil, never()).decrypt(any());
    }

    @Test
    void getDecryptedApiKey_WhenEncryptedKeyExists_ShouldDecryptAndReturn() {
        testUser.setGeminiApiKeyEncrypted(ENCRYPTED_KEY);
        when(encryptionUtil.decrypt(ENCRYPTED_KEY)).thenReturn(PLAIN_KEY);

        String result = apiKeyService.getDecryptedApiKey(testUser);

        assertThat(result).isEqualTo(PLAIN_KEY);
        verify(encryptionUtil).decrypt(ENCRYPTED_KEY);
    }

    @Test
    void saveApiKey_WithValidKey_ShouldEncryptAndSave() {
        when(encryptionUtil.encrypt(PLAIN_KEY)).thenReturn(ENCRYPTED_KEY);

        apiKeyService.saveApiKey(testUser, PLAIN_KEY);

        assertThat(testUser.getGeminiApiKeyEncrypted()).isEqualTo(ENCRYPTED_KEY);
        verify(userService).save(testUser);
    }

    @Test
    void saveApiKey_WithNullKey_ShouldClearEncryptedKeyAndSave() {
        testUser.setGeminiApiKeyEncrypted(ENCRYPTED_KEY); // existing key

        apiKeyService.saveApiKey(testUser, null);

        assertThat(testUser.getGeminiApiKeyEncrypted()).isNull();
        verify(userService).save(testUser);
        verify(encryptionUtil, never()).encrypt(any());
    }

    @Test
    void saveApiKey_WithBlankKey_ShouldClearEncryptedKeyAndSave() {
        testUser.setGeminiApiKeyEncrypted(ENCRYPTED_KEY);

        apiKeyService.saveApiKey(testUser, "   ");

        assertThat(testUser.getGeminiApiKeyEncrypted()).isNull();
        verify(userService).save(testUser);
        verify(encryptionUtil, never()).encrypt(any());
    }
}