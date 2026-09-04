package com.mymindmirror.backend.payload.response;

import java.util.List;

public record RoadmapContinuationResponse(List<RoadmapGenerateResponse.Task> tasks) {}