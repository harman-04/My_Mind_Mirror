package com.mymindmirror.backend.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AITask {
    // ------------------------------------------------------------------------
    // PLAIN TEXT TASKS (generate) - Utilizing the massive 1,500 RPD Gemma pools!
    // ------------------------------------------------------------------------
    TODAY_REFLECTION("gemma-4-31b-it", "gemma-4-26b-a4b-it"),
    REFLECTIVE_QUESTION("gemini-3.1-flash-lite", "gemma-4-26b-a4b-it"),
    // High-Reasoning Chat uses premium 3.5 Flash, falls back to 3 Flash
    REFLECTION_CHAT("gemini-3.5-flash", "gemini-3-flash"),

    // ------------------------------------------------------------------------
    // STRUCTURED JSON TASKS (generateStructured) - GEMINI ONLY
    // Primary is ALWAYS the high-capacity 3.1-Flash-Lite (500 RPD pool).
    // Fallbacks are distributed perfectly to capture 2.5, 2.5-Lite, and 3.0 pools!
    // ------------------------------------------------------------------------

    // Journal Pipeline
    JOURNAL_ANALYSIS("gemini-3.1-flash-lite", "gemini-2.5-flash-lite"), // Capture 2.5 Lite pool

    // Roadmap Engine
    ROADMAP_INITIAL("gemini-3.1-flash-lite", "gemini-3-flash"),
    ROADMAP_EXTENSION("gemini-3.1-flash-lite", "gemini-3-flash"),
    ROADMAP_NEXT_STEPS("gemini-3.1-flash-lite", "gemini-2.5-flash"),       // Capture standard 2.5 Flash pool
    ROADMAP_ELABORATION("gemini-3.1-flash-lite", "gemini-2.5-flash-lite"),  // Capture 2.5 Lite pool
    ROADMAP_RESCHEDULE("gemini-3.1-flash-lite", "gemini-3-flash"),

    // Tasking & Calendars
    MILESTONE_INSIGHTS("gemini-3.1-flash-lite", "gemini-2.5-flash"),
    PARSE_GROWTH_TIP("gemini-3.1-flash-lite", "gemini-2.5-flash-lite"),    // Capture 2.5 Lite pool
    SCHEDULE_GENERATION("gemini-3.1-flash-lite", "gemini-3-flash"),
    SCHEDULE_REOPTIMIZATION("gemini-3.1-flash-lite", "gemini-2.5-flash");

    private final String primaryModel;
    private final String fallbackModel;
}