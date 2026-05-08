// RoadmapGenerateRequest.java
package com.mymindmirror.backend.payload.request;

import lombok.Data;

@Data
public class RoadmapGenerateRequest {
    private String goal;
    private Integer timeframeWeeks; // kept for backward compatibility (weeks)
    private Integer timeframeValue; // new: numeric value
    private String timeframeUnit;   // "DAYS", "WEEKS", "MONTHS", "YEARS"
}