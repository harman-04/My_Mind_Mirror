// src/main/java/com/mymindmirror.backend/service/UserDetailsServiceImpl.java
package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.UserRepository;
import com.mymindmirror.backend.security.services.UserDetailsImpl; // IMPORT YOUR CUSTOM USERDETAILSIMPL
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList; // Keep this if needed elsewhere, but for now it's replaced

/**
 * Custom implementation of Spring Security's UserDetailsService.
 * This service is responsible for loading user-specific data during the authentication process.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        logger.info("Attempting to load user by username: {}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    logger.warn("User not found: {}", username);
                    return new UsernameNotFoundException("User not found with username: " + username);
                });

        logger.info("User {} found. Building UserDetails.", username);
        // ⭐ CRITICAL CHANGE HERE: Return your custom UserDetailsImpl ⭐
        return UserDetailsImpl.build(user); // Use the static build method you already defined!
    }
}