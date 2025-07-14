// src/main/java/com/mymindmirror.backend/exception/RestExceptionHandler.java
package com.mymindmirror.backend.exception;

import com.mymindmirror.backend.payload.response.MessageResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Global exception handler for REST controllers.
 * Provides centralized error handling for common exceptions.
 */
@ControllerAdvice
public class RestExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(RestExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<MessageResponse> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
        logger.error("IllegalArgumentException: {}", ex.getMessage());
        return new ResponseEntity<>(new MessageResponse(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RuntimeException.class) // Catch specific runtime exceptions if needed
    public ResponseEntity<MessageResponse> handleRuntimeException(RuntimeException ex, WebRequest request) {
        logger.error("RuntimeException: {}", ex.getMessage(), ex);
        // You might want to distinguish between different RuntimeExceptions
        // and return different HttpStatus codes or messages based on their type.
        // For simplicity, here it's treated as INTERNAL_SERVER_ERROR.
        return new ResponseEntity<>(new MessageResponse("An unexpected error occurred: " + ex.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class) // Catch all other unhandled exceptions
    public ResponseEntity<MessageResponse> handleAllExceptions(Exception ex, WebRequest request) {
        logger.error("An unhandled exception occurred: {}", ex.getMessage(), ex);
        return new ResponseEntity<>(new MessageResponse("An internal server error occurred."), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // You can add more @ExceptionHandler methods for other specific exceptions (e.g., AccessDeniedException, DataIntegrityViolationException)
}