package com.mymindmirror.backend.payload.response;

public record ApiKeyStatusResponse(boolean usingOwnKey, String maskedKey, String message) {}
