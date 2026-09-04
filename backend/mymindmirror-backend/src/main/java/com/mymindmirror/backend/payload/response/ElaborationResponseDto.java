package com.mymindmirror.backend.payload.response;

import java.util.List;
import java.util.UUID;

public record ElaborationResponseDto(
        UUID id,
        String details,
        List<String> subtasks
) {}