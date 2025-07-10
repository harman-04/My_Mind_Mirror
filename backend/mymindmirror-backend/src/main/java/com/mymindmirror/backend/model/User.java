package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.Data; // Lombok annotation for getters, setters, equals, hashCode, toString
import java.util.UUID; // For universally unique identifiers

/**
 * Represents a user in the MyMindMirror application.
 * This entity maps to the 'users' table in the database.
 */
@Entity // Marks this class as a JPA entity
@Table(name = "users") // Specifies the table name in the database
@Data // Lombok annotation: automatically generates getters, setters, toString, equals, and hashCode methods
public class User {

    @Id // Marks this field as the primary key
    @GeneratedValue(strategy = GenerationType.UUID) // Generates a UUID for the ID automatically
    private UUID id;

    @Column(nullable = false, unique = true) // Ensures username is not null and is unique
    private String username;

    @Column(nullable = false, unique = true) // Ensures email is not null and is unique
    private String email;

    @Column(nullable = false) // Stores the hashed password, should not be null
    private String passwordHash; // Stores the hashed password for security
}
