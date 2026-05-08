// src/main/java/com/mymindmirror/backend/repository/UserRoadmapPreferencesRepository.java
package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserRoadmapPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRoadmapPreferencesRepository extends JpaRepository<UserRoadmapPreferences, UUID> {
    Optional<UserRoadmapPreferences> findByUser(User user);
}