package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ChatRequest;
import com.mymindmirror.backend.payload.response.ChatResponse;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/chat")
public class ReflectionChatController {

    private final JournalService journalService;
    private final UserService userService;

    public ReflectionChatController(JournalService journalService, UserService userService) {
        this.journalService = journalService;
        this.userService = userService;
    }

    @PostMapping("/reflect")
    public ResponseEntity<ChatResponse> reflect(@AuthenticationPrincipal UserDetails userDetails,
                                                @RequestBody ChatRequest request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        String answer = journalService.generateReflectionChat(userOpt.get(), request.getQuery());
        return ResponseEntity.ok(new ChatResponse(answer));
    }

    @PostMapping("/suggest-question")
    public ResponseEntity<ChatResponse> suggestQuestion(@AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        String question = journalService.generateReflectiveQuestion(userOpt.get());
        return ResponseEntity.ok(new ChatResponse(question));
    }
}