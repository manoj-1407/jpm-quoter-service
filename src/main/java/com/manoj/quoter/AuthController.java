package com.manoj.quoter;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;
import java.util.Set;

/**
 * Authentication controller.
 *
 * POST /auth/token   - issue access + refresh token pair
 * POST /auth/refresh - exchange refresh token for new access token (token rotation)
 * POST /auth/revoke  - revoke tokens (logout)
 *
 * Brute-force protection: failed attempts tracked in Redis with 15-minute TTL.
 * Survives restarts and works correctly behind multiple instances.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log          = LoggerFactory.getLogger(AuthController.class);
    private static final int    MAX_ATTEMPTS = 10;
    private static final Set<String> VALID_ROLES = Set.of("ADMIN", "USER");

    private final JwtUtil             jwtUtil;
    private final StringRedisTemplate redis;

    public AuthController(JwtUtil jwtUtil, StringRedisTemplate redis) {
        this.jwtUtil = jwtUtil;
        this.redis   = redis;
    }

    // -- Token issuance --------------------------------------------------------

    @PostMapping("/token")
    public ResponseEntity<Map<String, String>> issueToken(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        String ip          = request.getRemoteAddr();
        String attemptKey  = "auth:attempts:" + ip;
        String attemptVal  = redis.opsForValue().get(attemptKey);
        int    attempts    = (attemptVal == null) ? 0 : Integer.parseInt(attemptVal);

        if (attempts >= MAX_ATTEMPTS) {
            log.warn("Auth blocked - too many attempts from ip={}", ip);
            return ResponseEntity.status(429).body(Map.of(
                    "error",   "TOO_MANY_ATTEMPTS",
                    "message", "Too many authentication attempts - try again later"));
        }

        String clientId = body.get("clientId");
        if (clientId == null || clientId.isBlank()) {
            redis.opsForValue().increment(attemptKey);
            redis.expire(attemptKey, Duration.ofMinutes(15));
            throw new IllegalArgumentException("clientId is required");
        }

        String role = body.getOrDefault("role", "USER").toUpperCase().trim();
        if (!VALID_ROLES.contains(role)) {
            redis.opsForValue().increment(attemptKey);
            redis.expire(attemptKey, Duration.ofMinutes(15));
            throw new IllegalArgumentException("role must be ADMIN or USER");
        }

        // Success - clear attempt counter
        redis.delete(attemptKey);

        String accessToken  = jwtUtil.generate(clientId.trim(), role);
        String refreshToken = jwtUtil.generateRefreshToken(clientId.trim(), role);

        log.info("Token issued for clientId={} role={} ip={}", clientId, role, ip);
        return ResponseEntity.ok(Map.of(
                "token",            accessToken,
                "refreshToken",     refreshToken,
                "role",             role,
                "expiresIn",        "900s",
                "refreshExpiresIn", "604800s"));
    }

    // -- Token refresh (rotation) ----------------------------------------------

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(
            @RequestBody Map<String, String> body) {

        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "refreshToken is required"));
        }

        String[] parts = jwtUtil.validateRefreshToken(refreshToken);
        if (parts == null || parts.length < 2) {
            return ResponseEntity.status(401).body(Map.of(
                    "error",   "INVALID_REFRESH_TOKEN",
                    "message", "Refresh token is invalid or expired"));
        }

        String clientId = parts[0];
        String role     = parts[1];

        // Rotate: revoke old, issue new pair
        jwtUtil.revokeRefreshToken(refreshToken);
        String newAccessToken  = jwtUtil.generate(clientId, role);
        String newRefreshToken = jwtUtil.generateRefreshToken(clientId, role);

        log.info("Token refreshed for clientId={}", clientId);
        return ResponseEntity.ok(Map.of(
                "token",        newAccessToken,
                "refreshToken", newRefreshToken,
                "expiresIn",    "900s"));
    }

    // -- Token revocation (logout) ---------------------------------------------

    @PostMapping("/revoke")
    public ResponseEntity<Map<String, String>> revoke(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        String refreshToken = body.get("refreshToken");
        String accessToken  = body.get("accessToken");

        if (refreshToken != null) jwtUtil.revokeRefreshToken(refreshToken);
        if (accessToken  != null) {
            String bearer = request.getHeader("Authorization");
            if (bearer != null && bearer.startsWith("Bearer ")) {
                jwtUtil.revokeAccessToken(bearer.substring(7).trim());
            }
        }

        return ResponseEntity.ok(Map.of("message", "Tokens revoked"));
    }
}
