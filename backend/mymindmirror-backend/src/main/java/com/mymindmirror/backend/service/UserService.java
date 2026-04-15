package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.JournalEntry;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.UserProfileRequest;
import com.mymindmirror.backend.repository.JournalEntryRepository;
import com.mymindmirror.backend.repository.UserRepository;
import com.mymindmirror.backend.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service class for managing User-related business logic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JournalEntryRepository journalEntryRepository;


    public User registerNewUser(String username, String email, String password) {
        log.info("Attempting to register new user: {}", username);
        if (userRepository.existsByUsername(username)) {
            log.warn("Registration failed: Username '{}' already exists.", username);
            throw new IllegalArgumentException("Username already exists.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            log.warn("Registration failed: Email '{}' already exists.", email);
            throw new IllegalArgumentException("Email already exists.");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));

        User savedUser = userRepository.save(user);
        log.info("User '{}' registered successfully with ID: {}", username, savedUser.getId());
        return savedUser;
    }

    public Optional<User> findByUsername(String username) {
        log.debug("Attempting to find user by username: {}", username);
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(UUID id) {
        log.debug("Attempting to find user by ID: {}", id);
        return userRepository.findById(id);
    }

    public List<User> findAllUsers() {
        log.debug("Attempting to find all users.");
        return userRepository.findAll();
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public User updateUser(UUID userId, UserProfileRequest request) {
        log.info("Attempting to update user with ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("User update failed: User with ID {} not found.", userId);
                    return new IllegalArgumentException("User not found.");
                });

        boolean changed = false;

        if (request.getUsername() != null && !request.getUsername().trim().isEmpty() && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                log.warn("User update failed: New username '{}' already exists.", request.getUsername());
                throw new IllegalArgumentException("Username already taken.");
            }
            user.setUsername(request.getUsername());
            changed = true;
            log.debug("Updated username to: {}", request.getUsername());
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty() && !request.getEmail().equals(user.getEmail())) {
            // Check if the new email exists for another user (not the current one)
            Optional<User> existingUserWithEmail = userRepository.findByEmail(request.getEmail());
            if (existingUserWithEmail.isPresent() && !existingUserWithEmail.get().getId().equals(userId)) {
                log.warn("User update failed: New email '{}' already exists for another user.", request.getEmail());
                throw new IllegalArgumentException("Email already taken by another user.");
            }
            user.setEmail(request.getEmail());
            changed = true;
            log.debug("Updated email to: {}", request.getEmail());
        }

        if (changed) {
            User updatedUser = userRepository.save(user);
            log.info("User with ID {} updated successfully.", userId);
            return updatedUser;
        } else {
            log.info("No changes detected for user with ID {}. Returning existing user.", userId);
            return user;
        }
    }

    public void deleteUser(UUID userId) {
        log.info("Attempting to delete user with ID: {}", userId);
        if (!userRepository.existsById(userId)) {
            log.warn("User deletion failed: User with ID {} not found.", userId);
            throw new IllegalArgumentException("User not found.");
        }
        userRepository.deleteById(userId);
        log.info("User with ID {} deleted successfully.", userId);
    }

    /**
     * Changes a user's password after verifying the current password.
     * @param userId The ID of the user whose password is to be changed.
     * @param currentPassword The user's current raw password.
     * @param newPassword The user's new raw password.
     * @throws IllegalArgumentException if user not found, current password is incorrect,
     * or new password is the same as the old password.
     */
    @Transactional
    public void changeUserPassword(UUID userId, String currentPassword, String newPassword) {
        log.info("Attempting to change password for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect current password.");
        }

        // Check if new password is same as old
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("New password cannot be the same as the old password.");
        }

        // --- Re-encrypt all journal entries with the new password hash ---
        List<JournalEntry> userEntries = journalEntryRepository.findByUser(user);
        log.info("Re-encrypting {} journal entries for user: {}", userEntries.size(), user.getUsername());

        String oldPasswordHash = user.getPasswordHash(); // current hash (before change)
        String newPasswordHash = passwordEncoder.encode(newPassword);

        for (JournalEntry entry : userEntries) {
            // Decrypt with old password hash
            String decryptedText = EncryptionUtil.decrypt(entry.getRawText(), oldPasswordHash);
            if (decryptedText == null) {
                // If decryption fails (e.g., corrupted data), log and skip
                log.warn("Failed to decrypt entry {} for user {}. Skipping re-encryption.", entry.getId(), user.getUsername());
                continue;
            }
            // Encrypt with new password hash
            String newEncryptedText = EncryptionUtil.encrypt(decryptedText, newPasswordHash);
            if (newEncryptedText == null) {
                log.error("Failed to encrypt entry {} for user {}. Aborting password change.", entry.getId(), user.getUsername());
                throw new RuntimeException("Failed to re-encrypt journal entries. Password change aborted.");
            }
            entry.setRawText(newEncryptedText);
        }

        // Save all updated entries
        journalEntryRepository.saveAll(userEntries);
        log.info("Successfully re-encrypted {} entries for user: {}", userEntries.size(), user.getUsername());

        // Update password hash
        user.setPasswordHash(newPasswordHash);
        userRepository.save(user);

        log.info("Password changed successfully for user ID: {}", userId);
    }

    public User save(User user) {
        return userRepository.save(user);
    }
}
