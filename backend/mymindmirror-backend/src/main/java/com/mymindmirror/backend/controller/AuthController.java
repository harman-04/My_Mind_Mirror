package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.payload.request.AuthRequest;
import com.mymindmirror.backend.payload.response.AuthResponse;
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.security.JwtUtil;
import com.mymindmirror.backend.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody AuthRequest request) {
        log.info("Received registration request for username: {}", request.username());

        userService.registerNewUser(request.username(), request.email(), request.password());

        log.info("User '{}' registered successfully.", request.username());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(null, "User registered successfully.")); // ✅ FIXED
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> createAuthenticationToken(@Valid @RequestBody AuthRequest request) {
        log.info("Received login request for username: {}", request.username());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal(); // ✅ Safe Cast
        final String jwt = jwtUtil.generateToken(userDetails, userDetails.getId());

        log.info("JWT generated for user '{}'.", request.username());
        return ResponseEntity.ok(new AuthResponse(jwt, "Login successful."));
    }
}