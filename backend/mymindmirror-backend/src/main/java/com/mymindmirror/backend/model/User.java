package com.mymindmirror.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    // New field: stores encrypted Gemini API key
    @Column(name = "gemini_api_key", length = 512)
    private String geminiApiKeyEncrypted; // encrypted with master key
}