package com.manoj.quoter;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.boot.test.context.TestConfiguration;
import redis.embedded.RedisServer;

@TestConfiguration
public class TestRedisConfig {

    private RedisServer redisServer;

    @PostConstruct
    public void startRedis() {
        try {
            redisServer = new RedisServer(6379);
            redisServer.start();
        } catch (Throwable e) {
            // Port already in use or native binary unavailable — real Redis is running, fine
        }
    }

    @PreDestroy
    public void stopRedis() {
        try {
            if (redisServer != null) redisServer.stop();
        } catch (Throwable ignored) {}
    }
}
