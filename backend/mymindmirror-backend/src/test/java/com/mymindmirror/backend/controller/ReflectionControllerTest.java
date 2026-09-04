//package com.mymindmirror.backend.controller;
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.mymindmirror.backend.model.User;
//import com.mymindmirror.backend.security.JwtUtil;
//import com.mymindmirror.backend.service.JournalService;
//import com.mymindmirror.backend.service.UserService;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
//import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
//import org.springframework.http.MediaType;
//import org.springframework.security.test.context.support.WithMockUser;
//import org.springframework.test.context.bean.override.mockito.MockitoBean;
//import org.springframework.test.web.servlet.MockMvc;
//
//import java.util.Map;
//import java.util.Optional;
//import java.util.UUID;
//
//import static org.mockito.ArgumentMatchers.eq;
//import static org.mockito.Mockito.when;
//import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
//import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
//
//@WebMvcTest(ReflectionController.class)
//@AutoConfigureMockMvc(addFilters = false)
//class ReflectionControllerTest {
//
//    @Autowired
//    private MockMvc mockMvc;
//
//    @Autowired
//    private ObjectMapper objectMapper;
//
//    @MockitoBean
//    private JournalService journalService;
//
//    @MockitoBean
//    private UserService userService;
//
//    @MockitoBean
//    private JwtUtil jwtUtil;
//
//    private User testUser;
//
//    @BeforeEach
//    void setUp() {
//        testUser = new User();
//        testUser.setId(UUID.randomUUID());
//        testUser.setUsername("testuser");
//        testUser.setEmail("test@example.com");
//        testUser.setPasswordHash("hashed");
//
//        // Default mock for user lookup - will be overridden in specific tests if needed
//        when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
//    }
//
//    @Test
//    @WithMockUser(username = "testuser")
//    void generateDailyReflection_Success_ReturnsReflection() throws Exception {
//        String promptText = "What made me happy today?";
//        String expectedReflection = "You felt joy because you spent time with family.";
//
//        when(journalService.generateReflectionFromMlService(eq(promptText), eq(testUser)))
//                .thenReturn(expectedReflection);
//
//        mockMvc.perform(post("/api/reflection/generate")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(Map.of("prompt_text", promptText))))
//                .andExpect(status().isOk())
//                .andExpect(jsonPath("$.reflection").value(expectedReflection));
//    }
//
//    @Test
//    @WithMockUser(username = "testuser")
//    void generateDailyReflection_MissingPromptText_ReturnsBadRequest() throws Exception {
//        mockMvc.perform(post("/api/reflection/generate")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(Map.of())))
//                .andExpect(status().isBadRequest())
//                .andExpect(jsonPath("$.error").value("Prompt text is required."));
//    }
//
//    @Test
//    @WithMockUser(username = "testuser")
//    void generateDailyReflection_UserNotFound_ReturnsNotFound() throws Exception {
//        // Override the default mock for this test only
//        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());
//
//        mockMvc.perform(post("/api/reflection/generate")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(Map.of("prompt_text", "Hello"))))
//                .andExpect(status().isNotFound())
//                .andExpect(jsonPath("$.error").value("User not found."));
//    }
//
//    @Test
//    @WithMockUser(username = "testuser")
//    void generateDailyReflection_ServiceThrowsException_ReturnsInternalServerError() throws Exception {
//        String promptText = "Hello";
//        when(journalService.generateReflectionFromMlService(eq(promptText), eq(testUser)))
//                .thenThrow(new RuntimeException("AI service down"));
//
//        mockMvc.perform(post("/api/reflection/generate")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(Map.of("prompt_text", promptText))))
//                .andExpect(status().isInternalServerError())
//                .andExpect(jsonPath("$.error").value("Failed to generate reflection: AI service down"));
//    }
//
//    @Test
//    void generateDailyReflection_Unauthenticated_ReturnsUnauthorized() throws Exception {
//        mockMvc.perform(post("/api/reflection/generate")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(Map.of("prompt_text", "Hello"))))
//                .andExpect(status().isUnauthorized());
//    }
//}