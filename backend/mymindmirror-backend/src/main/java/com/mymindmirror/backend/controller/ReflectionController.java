package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.service.GamificationService;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ReflectionController {

    private final JournalService journalService;
    private final UserService userService;
    private final GamificationService gamificationService;


    /**
     * Endpoint to generate a daily reflection using the ML service.
     * The frontend sends a prompt, and Spring Boot proxies the request to Flask.
     * @param userDetails The authenticated user's details.
     * @return A ResponseEntity containing the generated reflection or an error message.
     */
    @PostMapping("/reflection/generate")
    public ResponseEntity<Map<String, String>> generateDailyReflection(@AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Authentication required."));
        }

        User user = userService.findByUsername(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "User not found."));
        }

        log.info("Received secure request to generate reflection for user: {}", user.getUsername());

        try {
            // Note: Calling the new method we just wrote!
            String reflection = journalService.generateDailyReflection(user);

            // 💡 NEW: Reward for introspection and emotional wellness!
            gamificationService.recordActivity(user, "AI_REFLECTION");

            return ResponseEntity.ok(Collections.singletonMap("reflection", reflection));
        } catch (Exception e) {
            log.error("Error generating reflection for user {}: {}", user.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to generate reflection."));
        }
    }
}
