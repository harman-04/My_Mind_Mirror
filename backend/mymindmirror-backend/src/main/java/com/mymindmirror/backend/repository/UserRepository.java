package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA Repository for User entities.
 * Provides standard CRUD operations and custom query methods for User data.
 */
@Repository // Marks this interface as a Spring Data JPA repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds a User by their username.
     * Spring Data JPA automatically generates the query based on the method name.
     * @param username The username to search for.
     * @return An Optional containing the User if found, or empty if not.
     */
    Optional<User> findByUsername(String username);

    /**
     * Checks if a User with the given username already exists.
     * @param username The username to check.
     * @return True if a user with this username exists, false otherwise.
     */
    Boolean existsByUsername(String username);
}
