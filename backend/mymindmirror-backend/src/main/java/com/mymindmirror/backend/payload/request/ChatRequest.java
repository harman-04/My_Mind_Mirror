package com.mymindmirror.backend.payload.request;
public record ChatRequest(String query, String sessionId, boolean rememberChat) {}