// src/main/java/com/mymindmirror/backend/mapper/JsonMapperHelper.java
package com.mymindmirror.backend.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.mapstruct.Named;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class JsonMapperHelper {

    private final ObjectMapper objectMapper;

    public JsonMapperHelper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Named("jsonToStringList")
    public List<String> jsonToStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse JSON to string list: {}. Returning empty list.", json, e);
            return List.of(); // Return empty list on parse error instead of crashing
        }
    }

    @Named("stringListToJson")
    public String stringListToJson(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }


    // ... existing imports and class ...

    @Named("jsonToMap")
    public Map<String, Double> jsonToMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyMap();
        }
    }
}
