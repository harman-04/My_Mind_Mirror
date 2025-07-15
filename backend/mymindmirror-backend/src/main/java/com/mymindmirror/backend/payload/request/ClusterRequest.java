package com.mymindmirror.backend.payload.request;

import com.fasterxml.jackson.annotation.JsonProperty; // ⭐ NEW IMPORT ⭐
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClusterRequest {
    private List<String> journalTexts;

    @JsonProperty("nClusters") // ⭐ ADD THIS ANNOTATION ⭐
    private Integer nClusters;

    private UUID userId;
}
