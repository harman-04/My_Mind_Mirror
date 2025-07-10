package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Custom implementation of Spring Security's UserDetailsService.
 * This service is responsible for loading user-specific data during the authentication process.
 */
@Service // Marks this as a Spring service component
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    private final UserRepository userRepository; // To fetch user data from the database

    // Constructor injection for UserRepository
    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Locates the user based on the username.
     * In the actual authentication process, the incoming username (e.g., from login request)
     * is used to fetch user details from the database.
     * @param username The username identifying the user whose data is required.
     * @return A UserDetails object (Spring Security's user representation).
     * @throws UsernameNotFoundException if the user could not be found or has no granted authorities.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        logger.info("Attempting to load user by username: {}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    logger.warn("User not found: {}", username);
                    return new UsernameNotFoundException("User not found with username: " + username);
                });

        // Build Spring Security's UserDetails object from our custom User model.
        // For simplicity, we are not assigning specific roles/authorities here.
        // In a real app, you'd fetch roles from the DB and assign them.
        logger.info("User {} found. Building UserDetails.", username);
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(), // The hashed password from the database
                new java.util.ArrayList<>() // No roles/authorities for this MVP
        );
    }
}
