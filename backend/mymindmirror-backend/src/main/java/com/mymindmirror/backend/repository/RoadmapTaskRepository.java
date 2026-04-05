package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.RoadmapTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface RoadmapTaskRepository extends JpaRepository<RoadmapTask, UUID> {
}