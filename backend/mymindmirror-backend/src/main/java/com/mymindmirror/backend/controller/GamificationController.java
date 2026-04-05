package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserStats;
import com.mymindmirror.backend.payload.response.UserStatsResponse;
import com.mymindmirror.backend.service.GamificationService;
import com.mymindmirror.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/gamification")
public class GamificationController {

    private final GamificationService gamificationService;
    private final UserService userService;

    public GamificationController(GamificationService gamificationService, UserService userService) {
        this.gamificationService = gamificationService;
        this.userService = userService;
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStatsResponse> getUserStats(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        UserStatsResponse stats = gamificationService.getUserStats(userOpt.get());
        return ResponseEntity.ok(stats);
    }
}