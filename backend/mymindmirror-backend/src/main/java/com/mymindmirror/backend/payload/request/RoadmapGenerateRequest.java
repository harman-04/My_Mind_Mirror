package com.mymindmirror.backend.payload.request;

import lombok.Data;

@Data
public class RoadmapGenerateRequest {
    private String goal;
    private Integer timeframeWeeks; // optional
}