package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.UserProfileRequest;
import com.mymindmirror.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class for managing User-related business logic.
 */
@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerNewUser(String username, String email, String password) {
        logger.info("Attempting to register new user: {}", username);
        if (userRepository.existsByUsername(username)) {
            logger.warn("Registration failed: Username '{}' already exists.", username);
            throw new IllegalArgumentException("Username already exists.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            logger.warn("Registration failed: Email '{}' already exists.", email);
            throw new IllegalArgumentException("Email already exists.");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));

        User savedUser = userRepository.save(user);
        logger.info("User '{}' registered successfully with ID: {}", username, savedUser.getId());
        return savedUser;
    }

    public Optional<User> findByUsername(String username) {
        logger.debug("Attempting to find user by username: {}", username);
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(UUID id) {
        logger.debug("Attempting to find user by ID: {}", id);
        return userRepository.findById(id);
    }

    public List<User> findAllUsers() {
        logger.debug("Attempting to find all users.");
        return userRepository.findAll();
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public User updateUser(UUID userId, UserProfileRequest request) {
        logger.info("Attempting to update user with ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("User update failed: User with ID {} not found.", userId);
                    return new IllegalArgumentException("User not found.");
                });

        boolean changed = false;

        if (request.getUsername() != null && !request.getUsername().trim().isEmpty() && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                logger.warn("User update failed: New username '{}' already exists.", request.getUsername());
                throw new IllegalArgumentException("Username already taken.");
            }
            user.setUsername(request.getUsername());
            changed = true;
            logger.debug("Updated username to: {}", request.getUsername());
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty() && !request.getEmail().equals(user.getEmail())) {
            // Check if the new email exists for another user (not the current one)
            Optional<User> existingUserWithEmail = userRepository.findByEmail(request.getEmail());
            if (existingUserWithEmail.isPresent() && !existingUserWithEmail.get().getId().equals(userId)) {
                logger.warn("User update failed: New email '{}' already exists for another user.", request.getEmail());
                throw new IllegalArgumentException("Email already taken by another user.");
            }
            user.setEmail(request.getEmail());
            changed = true;
            logger.debug("Updated email to: {}", request.getEmail());
        }

        if (changed) {
            User updatedUser = userRepository.save(user);
            logger.info("User with ID {} updated successfully.", userId);
            return updatedUser;
        } else {
            logger.info("No changes detected for user with ID {}. Returning existing user.", userId);
            return user;
        }
    }

    public void deleteUser(UUID userId) {
        logger.info("Attempting to delete user with ID: {}", userId);
        if (!userRepository.existsById(userId)) {
            logger.warn("User deletion failed: User with ID {} not found.", userId);
            throw new IllegalArgumentException("User not found.");
        }
        userRepository.deleteById(userId);
        logger.info("User with ID {} deleted successfully.", userId);
    }

    /**
     * ⭐ NEW METHOD ⭐
     * Changes a user's password after verifying the current password.
     * @param userId The ID of the user whose password is to be changed.
     * @param currentPassword The user's current raw password.
     * @param newPassword The user's new raw password.
     * @throws IllegalArgumentException if user not found, current password is incorrect,
     * or new password is the same as the old password.
     */
    public void changeUserPassword(UUID userId, String currentPassword, String newPassword) {
        logger.info("Attempting to change password for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("Password change failed: User with ID {} not found.", userId);
                    return new IllegalArgumentException("User not found.");
                });

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            logger.warn("Password change failed for user ID {}: Incorrect current password.", userId);
            throw new IllegalArgumentException("Incorrect current password.");
        }

        // Check if new password is the same as old password
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            logger.warn("Password change failed for user ID {}: New password cannot be the same as old password.", userId);
            throw new IllegalArgumentException("New password cannot be the same as the old password.");
        }

        // Hash and set new password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        logger.info("Password changed successfully for user ID: {}", userId);
    }
}
