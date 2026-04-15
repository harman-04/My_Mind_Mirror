package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.UserProfileRequest;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.repository.UserRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JournalEntryRepository journalEntryRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(userId);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("oldEncodedPassword");
    }

    @Test
    void registerNewUser_ShouldSaveAndReturnUser() {
        String username = "newuser";
        String email = "new@example.com";
        String rawPassword = "password";
        String encodedPassword = "encodedPassword";

        when(userRepository.existsByUsername(username)).thenReturn(false);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(rawPassword)).thenReturn(encodedPassword);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User saved = userService.registerNewUser(username, email, rawPassword);

        assertThat(saved.getUsername()).isEqualTo(username);
        assertThat(saved.getEmail()).isEqualTo(email);
        assertThat(saved.getPasswordHash()).isEqualTo(encodedPassword);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerNewUser_WhenUsernameExists_ThrowsException() {
        when(userRepository.existsByUsername("existing")).thenReturn(true);
        assertThatThrownBy(() -> userService.registerNewUser("existing", "e@x.com", "pass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username already exists");
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUser_ShouldUpdateUsernameAndEmail() {
        UserProfileRequest request = new UserProfileRequest();
        request.setUsername("newUsername");
        request.setEmail("newemail@example.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByUsername("newUsername")).thenReturn(false);
        when(userRepository.findByEmail("newemail@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User updated = userService.updateUser(userId, request);

        assertThat(updated.getUsername()).isEqualTo("newUsername");
        assertThat(updated.getEmail()).isEqualTo("newemail@example.com");
        verify(userRepository).save(testUser);
    }

    @Test
    void deleteUser_ShouldDeleteWhenExists() {
        when(userRepository.existsById(userId)).thenReturn(true);
        userService.deleteUser(userId);
        verify(userRepository).deleteById(userId);
    }

    @Test
    void deleteUser_WhenNotFound_ThrowsException() {
        when(userRepository.existsById(userId)).thenReturn(false);
        assertThatThrownBy(() -> userService.deleteUser(userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void changeUserPassword_ShouldReEncryptEntriesAndUpdatePassword() {
        String oldPassword = "oldPass";
        String newPassword = "newPass";
        String oldEncoded = "oldEncodedPassword";
        String newEncoded = "newEncodedPassword";
        testUser.setPasswordHash(oldEncoded);

        JournalEntry entry1 = new JournalEntry();
        entry1.setId(UUID.randomUUID());
        entry1.setRawText("encryptedOld1");
        JournalEntry entry2 = new JournalEntry();
        entry2.setId(UUID.randomUUID());
        entry2.setRawText("encryptedOld2");
        List<JournalEntry> entries = List.of(entry1, entry2);

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(oldPassword, oldEncoded)).thenReturn(true);
        when(passwordEncoder.matches(newPassword, oldEncoded)).thenReturn(false);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(passwordEncoder.encode(newPassword)).thenReturn(newEncoded);

        // Mock static EncryptionUtil methods
        try (MockedStatic<EncryptionUtil> encryptionUtil = mockStatic(EncryptionUtil.class)) {
            encryptionUtil.when(() -> EncryptionUtil.decrypt(eq("encryptedOld1"), eq(oldEncoded)))
                    .thenReturn("decrypted1");
            encryptionUtil.when(() -> EncryptionUtil.decrypt(eq("encryptedOld2"), eq(oldEncoded)))
                    .thenReturn("decrypted2");
            encryptionUtil.when(() -> EncryptionUtil.encrypt(eq("decrypted1"), eq(newEncoded)))
                    .thenReturn("newEncrypted1");
            encryptionUtil.when(() -> EncryptionUtil.encrypt(eq("decrypted2"), eq(newEncoded)))
                    .thenReturn("newEncrypted2");

            userService.changeUserPassword(userId, oldPassword, newPassword);

            // Verify entries were re-encrypted
            assertThat(entry1.getRawText()).isEqualTo("newEncrypted1");
            assertThat(entry2.getRawText()).isEqualTo("newEncrypted2");
            verify(journalEntryRepository).saveAll(entries);
            verify(userRepository).save(testUser);
            assertThat(testUser.getPasswordHash()).isEqualTo(newEncoded);
        }
    }

    @Test
    void changeUserPassword_WhenCurrentPasswordIncorrect_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongPass", testUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> userService.changeUserPassword(userId, "wrongPass", "newPass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Incorrect current password");

        verify(journalEntryRepository, never()).findByUser(any());
        verify(userRepository, never()).save(any());
    }

    // ========== Additional Tests for Missing Coverage ==========

    @Test
    void findById_WhenUserExists_ReturnsUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        Optional<User> found = userService.findById(userId);
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    void findById_WhenUserNotFound_ReturnsEmpty() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        Optional<User> found = userService.findById(userId);
        assertThat(found).isEmpty();
    }

    @Test
    void getUserByUsername_WhenUserExists_ReturnsUser() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        User found = userService.getUserByUsername("testuser");
        assertThat(found).isNotNull();
        assertThat(found.getUsername()).isEqualTo("testuser");
    }

    @Test
    void getUserByUsername_WhenUserNotFound_ReturnsNull() {
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());
        User found = userService.getUserByUsername("missing");
        assertThat(found).isNull();
    }

    @Test
    void findAllUsers_ReturnsList() {
        List<User> users = List.of(testUser, new User());
        when(userRepository.findAll()).thenReturn(users);
        List<User> result = userService.findAllUsers();
        assertThat(result).hasSize(2);
        verify(userRepository).findAll();
    }

    @Test
    void save_DelegatesToRepository() {
        when(userRepository.save(testUser)).thenReturn(testUser);
        User saved = userService.save(testUser);
        assertThat(saved).isSameAs(testUser);
        verify(userRepository).save(testUser);
    }

    @Test
    void updateUser_WhenUserNotFound_ThrowsException() {
        UUID nonExistentId = UUID.randomUUID();
        when(userRepository.findById(nonExistentId)).thenReturn(Optional.empty());
        UserProfileRequest request = new UserProfileRequest();
        assertThatThrownBy(() -> userService.updateUser(nonExistentId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUser_WhenNoChanges_ReturnsSameUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        UserProfileRequest request = new UserProfileRequest();
        // No username or email set
        User result = userService.updateUser(userId, request);
        assertThat(result).isSameAs(testUser);
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUser_WhenOnlyUsernameChanges_Saves() {
        UserProfileRequest request = new UserProfileRequest();
        request.setUsername("newUsername");
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByUsername("newUsername")).thenReturn(false);
        when(userRepository.save(testUser)).thenReturn(testUser);

        User result = userService.updateUser(userId, request);
        assertThat(result.getUsername()).isEqualTo("newUsername");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(userRepository).save(testUser);
    }

    @Test
    void updateUser_WhenOnlyEmailChanges_Saves() {
        UserProfileRequest request = new UserProfileRequest();
        request.setEmail("newemail@example.com");
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("newemail@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(testUser)).thenReturn(testUser);

        User result = userService.updateUser(userId, request);
        assertThat(result.getEmail()).isEqualTo("newemail@example.com");
        verify(userRepository).save(testUser);
    }

    @Test
    void changeUserPassword_WhenDecryptionFailsForOneEntry_Continues() {
        String oldPassword = "oldPass";
        String newPassword = "newPass";
        String oldEncoded = "oldEncodedPassword";
        String newEncoded = "newEncodedPassword";
        testUser.setPasswordHash(oldEncoded);

        JournalEntry entry1 = new JournalEntry();
        entry1.setId(UUID.randomUUID());
        entry1.setRawText("encryptedOld1");
        JournalEntry entry2 = new JournalEntry();
        entry2.setId(UUID.randomUUID());
        entry2.setRawText("encryptedOld2");
        List<JournalEntry> entries = List.of(entry1, entry2);

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(oldPassword, oldEncoded)).thenReturn(true);
        when(passwordEncoder.matches(newPassword, oldEncoded)).thenReturn(false);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(passwordEncoder.encode(newPassword)).thenReturn(newEncoded);

        try (MockedStatic<EncryptionUtil> encryptionUtil = mockStatic(EncryptionUtil.class)) {
            // First entry fails decryption (returns null)
            encryptionUtil.when(() -> EncryptionUtil.decrypt(eq("encryptedOld1"), eq(oldEncoded)))
                    .thenReturn(null);
            // Second entry succeeds
            encryptionUtil.when(() -> EncryptionUtil.decrypt(eq("encryptedOld2"), eq(oldEncoded)))
                    .thenReturn("decrypted2");
            encryptionUtil.when(() -> EncryptionUtil.encrypt(eq("decrypted2"), eq(newEncoded)))
                    .thenReturn("newEncrypted2");

            userService.changeUserPassword(userId, oldPassword, newPassword);

            // First entry should not be modified (rawText unchanged)
            assertThat(entry1.getRawText()).isEqualTo("encryptedOld1");
            assertThat(entry2.getRawText()).isEqualTo("newEncrypted2");
            verify(journalEntryRepository).saveAll(entries);
            verify(userRepository).save(testUser);
            assertThat(testUser.getPasswordHash()).isEqualTo(newEncoded);
        }
    }

    @Test
    void changeUserPassword_WhenEncryptionFails_ThrowsRuntimeException() {
        String oldPassword = "oldPass";
        String newPassword = "newPass";
        String oldEncoded = "oldEncodedPassword";
        testUser.setPasswordHash(oldEncoded);

        JournalEntry entry = new JournalEntry();
        entry.setId(UUID.randomUUID());
        entry.setRawText("encryptedOld");
        List<JournalEntry> entries = List.of(entry);

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(oldPassword, oldEncoded)).thenReturn(true);
        when(passwordEncoder.matches(newPassword, oldEncoded)).thenReturn(false);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(passwordEncoder.encode(newPassword)).thenReturn("newEncoded");

        try (MockedStatic<EncryptionUtil> encryptionUtil = mockStatic(EncryptionUtil.class)) {
            encryptionUtil.when(() -> EncryptionUtil.decrypt(eq("encryptedOld"), eq(oldEncoded)))
                    .thenReturn("decrypted");
            encryptionUtil.when(() -> EncryptionUtil.encrypt(eq("decrypted"), eq("newEncoded")))
                    .thenReturn(null); // encryption fails

            assertThatThrownBy(() -> userService.changeUserPassword(userId, oldPassword, newPassword))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Failed to re-encrypt journal entries");

            verify(journalEntryRepository, never()).saveAll(any());
            verify(userRepository, never()).save(any());
        }
    }

    @Test
    void changeUserPassword_WhenDecryptionFailsForAllEntries_StillSucceeds() {
        String oldPassword = "oldPass";
        String newPassword = "newPass";
        String oldEncoded = "oldEncodedPassword";
        String newEncoded = "newEncodedPassword";
        testUser.setPasswordHash(oldEncoded);

        JournalEntry entry = new JournalEntry();
        entry.setId(UUID.randomUUID());
        entry.setRawText("encryptedOld");
        List<JournalEntry> entries = List.of(entry);

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(oldPassword, oldEncoded)).thenReturn(true);
        when(passwordEncoder.matches(newPassword, oldEncoded)).thenReturn(false);
        when(journalEntryRepository.findByUser(testUser)).thenReturn(entries);
        when(passwordEncoder.encode(newPassword)).thenReturn(newEncoded);

        try (MockedStatic<EncryptionUtil> encryptionUtil = mockStatic(EncryptionUtil.class)) {
            encryptionUtil.when(() -> EncryptionUtil.decrypt(eq("encryptedOld"), eq(oldEncoded)))
                    .thenReturn(null);

            userService.changeUserPassword(userId, oldPassword, newPassword);

            // Entry unchanged because decryption failed
            assertThat(entry.getRawText()).isEqualTo("encryptedOld");
            verify(journalEntryRepository).saveAll(entries);
            verify(userRepository).save(testUser);
            assertThat(testUser.getPasswordHash()).isEqualTo(newEncoded);
        }
    }
}