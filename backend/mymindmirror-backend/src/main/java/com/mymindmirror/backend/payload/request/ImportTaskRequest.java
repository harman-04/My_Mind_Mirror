package com.mymindmirror.backend.payload.request;

import lombok.Data;
import java.util.UUID;

@Data
public class ImportTaskRequest {
    private UUID roadmapId;
    private UUID taskId;
}