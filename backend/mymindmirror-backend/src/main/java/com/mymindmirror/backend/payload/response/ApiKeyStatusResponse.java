package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiKeyStatusResponse {
    private boolean usingOwnKey;
    private String maskedKey;
    private String message;
}