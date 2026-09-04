package com.mymindmirror.backend.payload.request;
import java.util.UUID;

public record ImportTaskRequest(UUID roadmapId, UUID taskId) {}