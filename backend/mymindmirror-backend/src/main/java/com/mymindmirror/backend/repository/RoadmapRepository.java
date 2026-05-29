package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.Roadmap;
import com.mymindmirror.backend.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

// RoadmapRepository.java
@Repository
public interface RoadmapRepository extends JpaRepository<Roadmap, UUID> {

    @EntityGraph("Roadmap.withAll")
    List<Roadmap> findByUserOrderByCreatedAtDesc(User user);

    // For single roadmap fetch
    @EntityGraph("Roadmap.withAll")
    Optional<Roadmap> findById(UUID id);
}