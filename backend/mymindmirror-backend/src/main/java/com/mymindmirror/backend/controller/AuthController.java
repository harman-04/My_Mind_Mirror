package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.payload.AuthRequest; // DTO for login/register request
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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for user authentication (registration and login).
 */
@RestController // Marks this class as a REST controller
@RequestMapping("/api/auth") // Base path for authentication endpoints
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager; // Used to authenticate users
    private final UserDetailsService userDetailsService; // To load user details after authentication
    private final JwtUtil jwtUtil; // To generate JWT tokens
    private final UserService userService; // To register new users

    // Constructor injection for all required dependencies
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
            // Call UserService to register the new user (password will be hashed inside service)
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
            // Authenticate the user using Spring Security's AuthenticationManager
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            logger.info("User '{}' authenticated successfully.", request.getUsername());

            // If authentication is successful, load UserDetails and generate JWT
            final UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
            final String jwt = jwtUtil.generateToken(userDetails);
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
