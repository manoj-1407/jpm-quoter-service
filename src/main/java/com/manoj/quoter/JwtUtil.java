package com.manoj.quoter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

/**
 * JWT utility with:
 * - Short-lived access tokens (15 min)
 * - Long-lived refresh tokens (7 days) stored in Redis
 * - Token revocation via Redis blocklist
 */
@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    private static final long ACCESS_TOKEN_MS  =  15 * 60 * 1_000L;   // 15 minutes
    private static final long REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1_000L; // 7 days

    private final SecretKey key;
    private final StringRedisTemplate redis;

    public JwtUtil(@Value("${jwt.secret}") String secret, StringRedisTemplate redis) {
        if (secret.length() < 32)
            throw new IllegalStateException("JWT secret must be at least 32 characters");
        this.key   = Keys.hmacShaKeyFor(secret.getBytes());
        this.redis = redis;
    }

    // ── Access token ─────────────────────────────────────────────────

    public String generate(String clientId) {
        return generate(clientId, "USER");
    }

    public String generate(String clientId, String role) {
        String jti = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(jti)
                .subject(clientId)
                .claim("role", role)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ACCESS_TOKEN_MS))
                .signWith(key)
                .compact();
    }

    // ── Refresh token ─────────────────────────────────────────────────

    /**
     * Issues a refresh token, stores it in Redis with 7-day TTL.
     * Returns the opaque refresh token string.
     */
    public String generateRefreshToken(String clientId, String role) {
        String refreshToken = UUID.randomUUID().toString();
        String redisKey = "refresh:" + refreshToken;
        redis.opsForValue().set(redisKey, clientId + ":" + role, Duration.ofMillis(REFRESH_TOKEN_MS));
        log.info("Refresh token issued for clientId={}", clientId);
        return refreshToken;
    }

    /**
     * Validates a refresh token and returns [clientId, role].
     * Returns null if invalid or expired.
     */
    public String[] validateRefreshToken(String refreshToken) {
        try {
            String val = redis.opsForValue().get("refresh:" + refreshToken);
            if (val == null) return null;
            return val.split(":", 2);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Revokes a refresh token (logout).
     */
    public void revokeRefreshToken(String refreshToken) {
        redis.delete("refresh:" + refreshToken);
        log.info("Refresh token revoked");
    }

    // ── Access token validation ───────────────────────────────────────

    public String extractClientId(String token) {
        return claims(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = claims(token).get("role");
        return role != null ? role.toString() : "USER";
    }

    public boolean isValid(String token) {
        try {
            Claims c = claims(token);
            if (c.getExpiration().before(new Date())) return false;
            // Check revocation blocklist
            String jti = c.getId();
            if (jti != null && Boolean.TRUE.equals(redis.hasKey("revoked:" + jti))) {
                return false;
            }
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Revokes a specific access token by JTI (for immediate invalidation).
     */
    public void revokeAccessToken(String token) {
        try {
            Claims c = claims(token);
            String jti = c.getId();
            if (jti != null) {
                long ttl = c.getExpiration().getTime() - System.currentTimeMillis();
                if (ttl > 0) {
                    redis.opsForValue().set("revoked:" + jti, "1", Duration.ofMillis(ttl));
                }
            }
        } catch (Exception e) {
            log.warn("Could not revoke access token: {}", e.getMessage());
        }
    }

    private Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
