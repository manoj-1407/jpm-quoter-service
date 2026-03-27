package com.manoj.quoter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);
    private static final int CAPACITY  = 20;
    private static final int REFILL    = 20;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final Counter rateLimitHits;

    public RateLimiterService(MeterRegistry metrics) {
        this.rateLimitHits = Counter.builder("quoter.ratelimit.hits")
                .description("Requests blocked by rate limiter").register(metrics);
    }

    public boolean tryConsume(String clientId) {
        Bucket bucket = buckets.computeIfAbsent(clientId, this::newBucket);
        boolean allowed = bucket.tryConsume(1);
        if (!allowed) {
            rateLimitHits.increment();
            log.warn("Rate limit exceeded for clientId={}", clientId);
        }
        return allowed;
    }

    private Bucket newBucket(String clientId) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(CAPACITY)
                .refillGreedy(REFILL, WINDOW)
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    // Visible for testing
    int getBucketCount() { return buckets.size(); }
}
