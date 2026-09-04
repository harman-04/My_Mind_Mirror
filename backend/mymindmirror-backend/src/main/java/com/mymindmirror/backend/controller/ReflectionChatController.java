package com.mymindmirror.backend.controller;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.request.ChatRequest;
import com.mymindmirror.backend.payload.response.ChatResponse;
import com.mymindmirror.backend.service.GamificationService;
import com.mymindmirror.backend.service.JournalService;
import com.mymindmirror.backend.service.UserService;
import com.mymindmirror.backend.service.ChatMemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ReflectionChatController {

    private final JournalService journalService;
    private final UserService userService;
    private final ChatMemoryService chatMemoryService; // NEW: Injected Memory Service
    private final GamificationService gamificationService;


    @PostMapping("/reflect")
    public ResponseEntity<ChatResponse> reflect(@AuthenticationPrincipal UserDetails userDetails,
                                                @RequestBody ChatRequest request) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        // Pass the new sessionId and rememberChat toggle to the service
        String answer = journalService.generateReflectionChat(
                userOpt.get(),
                request.getQuery(),
                request.getSessionId(),
                request.isRememberChat()
        );

        // 💡 NEW: Reward the user for talking to their AI Coach!
        gamificationService.recordActivity(userOpt.get(), "CHAT");
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

    // NEW: Endpoint to let the user clear their chat history manually
    @DeleteMapping("/clear-memory")
    public ResponseEntity<Void> clearMemory(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestParam String sessionId) {
        Optional<User> userOpt = userService.findByUsername(userDetails.getUsername());
        if (userOpt.isPresent() && sessionId != null && !sessionId.isBlank()) {
            chatMemoryService.clearHistory(userOpt.get().getId(), sessionId);
        }
        return ResponseEntity.ok().build();
    }
}