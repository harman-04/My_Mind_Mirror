// In src/main/java/com/mymindmirror/backend/payload/ClusterResult.java
package com.mymindmirror.backend.payload;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClusterResult {
    private Integer numClusters;
    private Map<String, List<String>> clusterThemes; // e.g., "Cluster 1": ["work", "stress"]
    private List<Integer> entryClusters; // List of cluster IDs corresponding to the input entries
}