package com.mymindmirror.backend.payload.response;
import java.time.LocalDate;

public record DailyAggregatedDataResponse(LocalDate date, Double averageMood, Long totalWords) {}
