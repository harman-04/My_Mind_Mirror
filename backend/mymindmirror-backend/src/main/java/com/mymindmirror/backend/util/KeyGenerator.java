package com.mymindmirror.backend.util;

import java.util.Base64;
import java.security.SecureRandom;

public class KeyGenerator {
    public static void main(String[] args) {
        SecureRandom random = new SecureRandom();

        // 1. Generate 256-bit AES Master Key (32 bytes)
        byte[] aesKey = new byte[32];
        random.nextBytes(aesKey);
        String base64AesKey = Base64.getEncoder().encodeToString(aesKey);

        // 2. Generate 512-bit JWT Secret (64 bytes for HS512)
        byte[] jwtKey = new byte[64];
        random.nextBytes(jwtKey);
        String base64JwtKey = Base64.getEncoder().encodeToString(jwtKey);

        System.out.println("--- COPY THESE TO YOUR .env FILE ---");
        System.out.println("ENCRYPTION_MASTER_KEY=" + base64AesKey);
        System.out.println("JWT_SECRET=" + base64JwtKey);
    }
}