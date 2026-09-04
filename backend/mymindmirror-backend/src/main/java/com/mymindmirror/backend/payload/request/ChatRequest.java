package com.mymindmirror.backend.payload.request;

import lombok.Data;

@Data
public class ChatRequest {
    private String query;
    private String sessionId;
    private boolean rememberChat;
}