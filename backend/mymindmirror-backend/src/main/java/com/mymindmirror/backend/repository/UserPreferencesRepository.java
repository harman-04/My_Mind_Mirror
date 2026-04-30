package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.model.UserPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserPreferencesRepository extends JpaRepository<UserPreferences, UUID> {
    Optional<UserPreferences> findByUser(User user);
}