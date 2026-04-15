package com.mymindmirror.backend.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private UserDetails userDetails;
    private UUID userId;

    private static final String TEST_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final long EXPIRATION_MS = 86400000L;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", EXPIRATION_MS);
        jwtUtil.init();

        userId = UUID.randomUUID();
        userDetails = mock(UserDetails.class);
        when(userDetails.getUsername()).thenReturn("testuser");
    }

    // Helper to access private key field
    private Object getKey() {
        return ReflectionTestUtils.getField(jwtUtil, "key");
    }

    @Test
    void generateToken_ShouldIncludeUserIdClaim() {
        String token = jwtUtil.generateToken(userDetails, userId);
        UUID extracted = jwtUtil.extractUserId(token);
        assertThat(extracted).isEqualTo(userId);
    }

    @Test
    void generateToken_ShouldHaveCorrectSubject() {
        String token = jwtUtil.generateToken(userDetails, userId);
        String subject = jwtUtil.extractUsername(token);
        assertThat(subject).isEqualTo("testuser");
    }

    @Test
    void extractUserId_WhenUserIdClaimMissing_ShouldThrowException() {
        String tokenWithoutUserId = Jwts.builder()
                .setSubject("testuser")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith((java.security.Key) getKey())
                .compact();
        assertThatThrownBy(() -> jwtUtil.extractUserId(tokenWithoutUserId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing 'userId' claim");
    }

    @Test
    void extractUserId_WhenUserIdClaimIsInvalidUUID_ShouldThrowException() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", "not-a-uuid");
        String invalidToken = Jwts.builder()
                .setClaims(claims)
                .setSubject("testuser")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith((java.security.Key) getKey())
                .compact();
        assertThatThrownBy(() -> jwtUtil.extractUserId(invalidToken))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid UUID format");
    }

    @Test
    void validateToken_WithValidToken_ShouldReturnTrue() {
        String token = jwtUtil.generateToken(userDetails, userId);
        boolean valid = jwtUtil.validateToken(token);
        assertThat(valid).isTrue();
    }

    @Test
    void validateToken_WithExpiredToken_ShouldReturnFalse() throws InterruptedException {
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 100L);
        jwtUtil.init();
        String token = jwtUtil.generateToken(userDetails, userId);
        Thread.sleep(200);
        boolean valid = jwtUtil.validateToken(token);
        assertThat(valid).isFalse();
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", EXPIRATION_MS);
        jwtUtil.init();
    }

    @Test
    void validateToken_WithMalformedToken_ShouldReturnFalse() {
        boolean valid = jwtUtil.validateToken("malformed.token.here");
        assertThat(valid).isFalse();
    }

    @Test
    void validateToken_WithWrongSignature_ShouldReturnFalse() {
        var wrongKey = Keys.hmacShaKeyFor("different-key-different-key-different-key".getBytes());
        String token = Jwts.builder()
                .setSubject("testuser")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(wrongKey)
                .compact();
        boolean valid = jwtUtil.validateToken(token);
        assertThat(valid).isFalse();
    }

    @Test
    void validateToken_WithEmptyToken_ShouldReturnFalse() {
        boolean valid = jwtUtil.validateToken("");
        assertThat(valid).isFalse();
    }

    @Test
    void validateTokenWithUserDetails_WhenUsernameMatchesAndNotExpired_ShouldReturnTrue() {
        String token = jwtUtil.generateToken(userDetails, userId);
        boolean valid = jwtUtil.validateToken(token, userDetails);
        assertThat(valid).isTrue();
    }

    @Test
    void validateTokenWithUserDetails_WhenUsernameDoesNotMatch_ShouldReturnFalse() {
        String token = jwtUtil.generateToken(userDetails, userId);
        UserDetails differentUser = mock(UserDetails.class);
        when(differentUser.getUsername()).thenReturn("wronguser");
        boolean valid = jwtUtil.validateToken(token, differentUser);
        assertThat(valid).isFalse();
    }

    @Test
    void validateTokenWithUserDetails_WhenTokenExpired_ShouldThrowExpiredJwtException() throws InterruptedException {
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 100L);
        jwtUtil.init();
        String token = jwtUtil.generateToken(userDetails, userId);
        Thread.sleep(200);
        assertThatThrownBy(() -> jwtUtil.validateToken(token, userDetails))
                .isInstanceOf(ExpiredJwtException.class);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", EXPIRATION_MS);
        jwtUtil.init();
    }

    @Test
    void extractUsername_ShouldReturnSubject() {
        String token = jwtUtil.generateToken(userDetails, userId);
        String username = jwtUtil.extractUsername(token);
        assertThat(username).isEqualTo("testuser");
    }

    @Test
    void extractExpiration_ShouldReturnFutureDate() {
        String token = jwtUtil.generateToken(userDetails, userId);
        Date expiration = jwtUtil.extractExpiration(token);
        assertThat(expiration).isAfter(new Date());
    }

    @Test
    void extractUserId_WhenTokenIsNull_ShouldThrowException() {
        assertThatThrownBy(() -> jwtUtil.extractUserId(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validateToken_WhenTokenIsNull_ShouldReturnFalse() {
        boolean valid = jwtUtil.validateToken((String) null);
        assertThat(valid).isFalse();
    }
}