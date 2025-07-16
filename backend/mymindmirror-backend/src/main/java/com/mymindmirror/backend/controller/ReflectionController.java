package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReflectionController {

    private static final Logger logger = LoggerFactory.getLogger(ReflectionController.class);

    private final JournalService journalService;
    private final UserService userService; // Assuming you need UserService to get the User object

    public ReflectionController(JournalService journalService, UserService userService) {
        this.journalService = journalService;
        this.userService = userService;
    }

    /**
     * Endpoint to generate a daily reflection using the ML service.
     * The frontend sends a prompt, and Spring Boot proxies the request to Flask.
     * @param userDetails The authenticated user's details.
     * @param requestBody A map containing the "prompt_text" for reflection generation.
     * @return A ResponseEntity containing the generated reflection or an error message.
     */
    @PostMapping("/reflection/generate")
    public ResponseEntity<Map<String, String>> generateDailyReflection(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> requestBody) {

        if (userDetails == null) {
            logger.warn("Unauthorized attempt to generate reflection: No user details.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Authentication required."));
        }

        User user = userService.findByUsername(userDetails.getUsername())
                .orElse(null);

        if (user == null) {
            logger.error("User not found for username: {}", userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "User not found."));
        }

        String promptText = requestBody.get("prompt_text");
        if (promptText == null || promptText.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Prompt text is required."));
        }

        logger.info("Received request to generate reflection for user: {}", user.getUsername());

        try {
            String reflection = journalService.generateReflectionFromMlService(promptText);
            return ResponseEntity.ok(Collections.singletonMap("reflection", reflection));
        } catch (Exception e) {
            logger.error("Error generating reflection for user {}: {}", user.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to generate reflection: " + e.getMessage()));
        }
    }
}
