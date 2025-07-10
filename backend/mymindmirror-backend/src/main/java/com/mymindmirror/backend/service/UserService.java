package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

/**
 * Service class for managing User-related business logic.
 */
@Service // Marks this as a Spring service component
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; // Injected for password hashing

    // Constructor injection
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Registers a new user.
     * Passwords are hashed using BCrypt before saving.
     * @param username The username for the new user.
     * @param email The email for the new user.
     * @param password The raw password (will be hashed).
     * @return The saved User entity.
     * @throws IllegalArgumentException if username or email already exists.
     */
    public User registerNewUser(String username, String email, String password) {
        logger.info("Attempting to register new user: {}", username);
        if (userRepository.existsByUsername(username)) {
            logger.warn("Registration failed: Username '{}' already exists.", username);
            throw new IllegalArgumentException("Username already exists.");
        }
        // You might also want to check if email exists:
        // if (userRepository.existsByEmail(email)) {
        //     logger.warn("Registration failed: Email '{}' already exists.", email);
        //     throw new IllegalArgumentException("Email already exists.");
        // }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password)); // Hash the password!

        User savedUser = userRepository.save(user);
        logger.info("User '{}' registered successfully with ID: {}", username, savedUser.getId());
        return savedUser;
    }

    /**
     * Finds a user by username.
     * @param username The username to search for.
     * @return An Optional containing the User if found.
     */
    public Optional<User> findByUsername(String username) {
        logger.debug("Attempting to find user by username: {}", username);
        return userRepository.findByUsername(username);
    }
}
