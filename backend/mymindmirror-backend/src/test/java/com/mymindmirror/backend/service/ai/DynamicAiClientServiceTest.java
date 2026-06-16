package com.mymindmirror.backend.service.ai;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.enums.AITask;
import com.mymindmirror.backend.service.ApiKeyService;
import com.mymindmirror.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DynamicAiClientServiceTest {

    @Mock
    private ApiKeyService apiKeyService;

    @Mock
    private UserService userService;

    @InjectMocks
    private DynamicAiClientService aiClientService;

    private User testUser;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(userId);

        // Inject properties required by the router
        ReflectionTestUtils.setField(aiClientService, "globalApiKey", "fake-global-api-key");
        ReflectionTestUtils.setField(aiClientService, "defaultTemperature", 0.4);
    }

    @Test
    void whenUserHasNoApiKey_thenUseGlobalModel() {
        // Arrange
        when(userService.findById(userId)).thenReturn(Optional.of(testUser));
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn(null);

        // Act & Assert
        // We expect it to try and build the model using the fake global key,
        // which will throw an authentication/network error eventually, but it shouldn't crash on building.
        try {
            aiClientService.generate("Hello", userId, AITask.REFLECTION_CHAT);
        } catch (Exception ignored) {}

        // Verify it checked for the key
        verify(apiKeyService, times(1)).getDecryptedApiKey(testUser);

        // Verify cache recorded the attempt
        Map<?, ?> cache = (Map<?, ?>) ReflectionTestUtils.getField(aiClientService, "userModelCache");
        assertNotNull(cache);
        assertEquals(1, cache.size());
    }

    @Test
    void whenUserHasApiKey_thenCreateAndCacheCustomModel() {
        // Arrange
        when(userService.findById(userId)).thenReturn(Optional.of(testUser));
        when(apiKeyService.getDecryptedApiKey(testUser)).thenReturn("fake-custom-api-key");

        // Act - Call it twice to test the cache
        try { aiClientService.generate("Hello", userId, AITask.REFLECTION_CHAT); } catch (Exception ignored) {}
        try { aiClientService.generate("Hello", userId, AITask.REFLECTION_CHAT); } catch (Exception ignored) {}

        // Assert: Verify it only asked the database for the key ONE time, proving caching works
        verify(apiKeyService, times(1)).getDecryptedApiKey(testUser);

        // Verify cache size for this specific task
        Map<?, ?> cache = (Map<?, ?>) ReflectionTestUtils.getField(aiClientService, "userModelCache");
        assertNotNull(cache);
        assertEquals(1, cache.size());
    }

    @Test
    @SuppressWarnings("unchecked")
    void whenEvictUserModel_thenCacheIsCleared() {
        // Arrange
        Map<String, ChatModel> cache = (Map<String, ChatModel>) ReflectionTestUtils.getField(aiClientService, "userModelCache");
        assertNotNull(cache);
        cache.put(userId.toString() + "_gemini-2.5-flash", mock(ChatModel.class)); // Manually stuff the cache

        // Act
        aiClientService.evictUserModel(userId);

        // Assert
        assertTrue(cache.isEmpty(), "Cache should be empty after eviction");
    }
}