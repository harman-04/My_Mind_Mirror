package com.mymindmirror.backend.payload.response;
import java.util.List;

public record Anomaly(String date, List<String> type, String message) {}