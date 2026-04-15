package com.mymindmirror.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAccessDeniedHandlerTest {

    private JwtAccessDeniedHandler handler;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private AccessDeniedException exception;

    @BeforeEach
    void setUp() {
        handler = new JwtAccessDeniedHandler();
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        exception = new AccessDeniedException("Test access denied message");
    }

    @Test
    void handle_ShouldReturnForbiddenWithJsonBody() throws Exception {
        // Given
        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);
        when(request.getRequestURI()).thenReturn("/api/test");

        // When
        handler.handle(request, response, exception);

        // Then
        verify(response).setStatus(403);
        verify(response).setContentType("application/json");

        printWriter.flush();
        String json = stringWriter.toString();
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> errorDetails = mapper.readValue(json, Map.class);

        assertThat(errorDetails).containsKey("timestamp");
        assertThat(errorDetails.get("status")).isEqualTo(403);
        assertThat(errorDetails.get("error")).isEqualTo("Forbidden");
        assertThat(errorDetails.get("message")).isEqualTo("You do not have permission to access this resource.");
        assertThat(errorDetails.get("debug_message")).isEqualTo("Test access denied message");
        assertThat(errorDetails.get("path")).isEqualTo("/api/test");
    }
}