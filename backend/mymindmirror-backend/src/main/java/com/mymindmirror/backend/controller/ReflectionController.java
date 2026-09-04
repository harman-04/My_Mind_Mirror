package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.annotation.CurrentUser;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.service.JournalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ReflectionController {

    private final JournalService journalService;

    @PostMapping("/reflection/generate")
    public ResponseEntity<Map<String, String>> generateDailyReflection(@CurrentUser User currentUser) {
        log.info("Received secure request to generate reflection for user: {}", currentUser.getUsername());

        try {
            String reflection = journalService.generateDailyReflection(currentUser);
            return ResponseEntity.ok(Collections.singletonMap("reflection", reflection));
        } catch (Exception e) {
            log.error("Error generating reflection for user {}: {}", currentUser.getUsername(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate reflection.");
        }
    }
}