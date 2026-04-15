package com.mymindmirror.backend.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiKeyResponse {
    private String maskedKey;
    private boolean isSet;
}