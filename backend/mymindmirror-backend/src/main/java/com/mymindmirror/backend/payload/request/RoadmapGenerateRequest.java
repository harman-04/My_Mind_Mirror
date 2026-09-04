// RoadmapGenerateRequest.java
package com.mymindmirror.backend.payload.request;

public record RoadmapGenerateRequest(
        String goal,
        Integer timeframeWeeks, // kept for backward compatibility (weeks)
        Integer timeframeValue, // new: numeric value
        String timeframeUnit    // "DAYS", "WEEKS", "MONTHS", "YEARS"
) {}