package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiKeyStatusResponse {
    private boolean usingOwnKey;
    private String maskedKey;
    private String message;
}