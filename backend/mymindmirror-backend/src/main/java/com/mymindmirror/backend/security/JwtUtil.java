package com.mymindmirror.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys; // For secure key generation
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Utility class for JWT (JSON Web Token) operations: generation, validation, and parsing.
 */
@Component // Marks this as a Spring component for dependency injection
public class JwtUtil {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);

    // Secret key for signing JWTs, loaded from application.properties
    @Value("${jwt.secret}")
    private String secretString;
    private SecretKey key; // Stored as SecretKey for direct use with JJWT

    // Token expiration time (e.g., 24 hours in milliseconds)
    @Value("${jwt.expiration.ms}")
    private long expirationMs;

    // This method will be called after dependency injection to initialize the key
    @jakarta.annotation.PostConstruct
    public void init() {
        // Ensure the secret string is long enough for HS256 (256 bits = 32 bytes)
        // If your secret string is shorter, Keys.hmacShaKeyFor will generate a warning.
        // It's best to use a base64 encoded string of at least 32 bytes.
        this.key = Keys.hmacShaKeyFor(secretString.getBytes());
        logger.info("JWT Secret Key initialized.");
    }

    /**
     * Extracts the username (subject) from the JWT.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the expiration date from the JWT.
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extracts a specific claim from the JWT.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extracts all claims (payload) from the JWT.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    /**
     * Checks if the token is expired.
     */
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Generates a JWT for a given UserDetails.
     */
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails.getUsername());
    }

    /**
     * Creates the JWT.
     */
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims) // Custom claims
                .setSubject(subject) // User identifier (username)
                .setIssuedAt(new Date(System.currentTimeMillis())) // Token issuance time
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs)) // Token expiration time
                .signWith(key, SignatureAlgorithm.HS256) // Sign with our secret key using HS256 algorithm
                .compact(); // Build and compact the JWT into a string
    }

    /**
     * Validates the JWT.
     */
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /**
     * Validates if a token is generally valid (syntax, signature, expiration).
     * Useful before trying to extract claims.
     */
    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(authToken);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            logger.error("Invalid JWT signature: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }
}
