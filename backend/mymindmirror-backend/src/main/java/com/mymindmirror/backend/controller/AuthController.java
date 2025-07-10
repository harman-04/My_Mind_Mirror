// In src/main/java/com/mymindmirror/backend/controller/AuthController.java

package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.AuthRequest; // Your DTO for login/register request
import com.mymindmirror.backend.payload.AuthResponse; // DTO for login/register response
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication; // Import Authentication
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional; // Import Optional

/**
 * REST Controller for user authentication (registration and login).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public AuthController(AuthenticationManager authenticationManager, UserDetailsService userDetailsService, JwtUtil jwtUtil, UserService userService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    /**
     * Handles user registration requests.
     * @param request AuthRequest containing username, email, and password.
     * @return ResponseEntity with success message or error.
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody AuthRequest request) {
        logger.info("Received registration request for username: {}", request.getUsername());
        try {
            userService.registerNewUser(request.getUsername(), request.getEmail(), request.getPassword());
            logger.info("User '{}' registered successfully.", request.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse("User registered successfully."));
        } catch (IllegalArgumentException e) {
            logger.warn("Registration failed for username '{}': {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new AuthResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("An unexpected error occurred during registration for username '{}': {}", request.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new AuthResponse("Registration failed due to an internal error."));
        }
    }

    /**
     * Handles user login requests.
     * @param request AuthRequest containing username and password.
     * @return ResponseEntity with JWT token on success, or error message.
     */
    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@RequestBody AuthRequest request) {
        logger.info("Received login request for username: {}", request.getUsername());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            logger.info("User '{}' authenticated successfully.", request.getUsername());

            final UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());

            // ⭐ IMPORTANT: Retrieve the User entity to get the UUID ⭐
            Optional<User> optionalUser = userService.findByUsername(userDetails.getUsername());
            if (optionalUser.isEmpty()) {
                logger.error("Authenticated user '{}' not found in database. This indicates a security misconfiguration.", userDetails.getUsername());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new AuthResponse(null, "Authenticated user not found."));
            }
            User user = optionalUser.get();

            // ⭐ MODIFIED: Pass the user's UUID to generateToken ⭐
            final String jwt = jwtUtil.generateToken(userDetails, user.getId());
            logger.info("JWT generated for user '{}'.", request.getUsername());

            return ResponseEntity.ok(new AuthResponse(jwt, "Login successful."));
        } catch (BadCredentialsException e) {
            logger.warn("Login failed for username '{}': Invalid credentials.", request.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new AuthResponse("Invalid username or password."));
        } catch (Exception e) {
            logger.error("An unexpected error occurred during login for username '{}': {}", request.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new AuthResponse("Login failed due to an internal error."));
        }
    }
}
