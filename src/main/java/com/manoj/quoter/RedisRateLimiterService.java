package com.manoj.quoter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Sliding-window rate limiter backed by Redis.
 * Survives application restarts and works correctly behind a load balancer.
 *
 * Algorithm: Redis INCR + EXPIRE (atomic per-IP counter with 1-minute window).
 * If Redis is unavailable, falls back to ALLOW (fail-open) with a warning.
 */
@Service
public class RedisRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimiterService.class);

    @Value("${rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    private final StringRedisTemplate redis;

    public RedisRateLimiterService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /**
     * Returns true if the request should be allowed, false if rate-limited.
     */
    public boolean isAllowed(String clientIp) {
        try {
            String key = "rate_limit:" + clientIp + ":" + (System.currentTimeMillis() / 60_000);
            Long count = redis.opsForValue().increment(key);
            if (count == null) return true;
            if (count == 1) {
                redis.expire(key, Duration.ofMinutes(2));
            }
            if (count > requestsPerMinute) {
                log.warn("Rate limit exceeded for ip={} count={}", clientIp, count);
                return false;
            }
            return true;
        } catch (Exception e) {
            // Fail-open: if Redis is down, allow the request but log a warning
            log.warn("Redis unavailable for rate limiting — failing open: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Returns remaining requests in the current window.
     */
    public long getRemaining(String clientIp) {
        try {
            String key = "rate_limit:" + clientIp + ":" + (System.currentTimeMillis() / 60_000);
            String val = redis.opsForValue().get(key);
            long used = val == null ? 0 : Long.parseLong(val);
            return Math.max(0, requestsPerMinute - used);
        } catch (Exception e) {
            return requestsPerMinute;
        }
    }
}
