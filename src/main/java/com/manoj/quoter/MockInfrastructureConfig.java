package com.manoj.quoter;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * Simplified mock config using some default implementations to avoid interface mismatch.
 */
@Configuration
@ConditionalOnProperty(name = "app.infrastructure.mock", havingValue = "true", matchIfMissing = true)
public class MockInfrastructureConfig {

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        return new RedisConnectionFactory() {
            @Override public org.springframework.data.redis.connection.RedisConnection getConnection() { return null; }
            @Override public org.springframework.data.redis.connection.RedisClusterConnection getClusterConnection() { return null; }
            @Override public boolean getConvertPipelineAndTxResults() { return false; }
            @Override public org.springframework.data.redis.connection.RedisSentinelConnection getSentinelConnection() { return null; }
            @Override public org.springframework.dao.DataAccessException translateExceptionIfPossible(RuntimeException ex) { return null; }
        };
    }

    @Bean(name = "redisTemplate")
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        return template;
    }

    @Bean
    @Primary
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        StringRedisTemplate template = new StringRedisTemplate() {
            private final Map<String, String> storage = new HashMap<>();
            @Override
            public ValueOperations<String, String> opsForValue() {
                return new MockValueOperations(storage);
            }
            @Override
            public Boolean delete(String key) {
                storage.remove(key);
                return true;
            }
            @Override
            public void afterPropertiesSet() {
                // Skip validation
            }
            @Override
            public Boolean hasKey(String key) {
                return storage.containsKey(key);
            }
        };
        template.setConnectionFactory(factory);
        return template;
    }

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate() {
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(new HashMap<>())) {
            @Override
            public java.util.concurrent.CompletableFuture send(String topic, String key, String data) {
                return new java.util.concurrent.CompletableFuture<>();
            }
        };
    }

    @Bean
    @ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "false", matchIfMissing = true)
    public PriceEventProducer priceEventProducer(KafkaTemplate<String, String> kafka) {
        return new PriceEventProducer(kafka, new io.micrometer.core.instrument.simple.SimpleMeterRegistry()) {
            @Override
            public void publish(String symbol, java.math.BigDecimal price) {
                // Do nothing
            }
        };
    }

    private static class MockValueOperations implements ValueOperations<String, String> {
        private final Map<String, String> storage;
        public MockValueOperations(Map<String, String> storage) { this.storage = storage; }

        @Override public String get(Object key) { return storage.get(key.toString()); }
        @Override public void set(String key, String value) { storage.put(key, value); }
        @Override public Long increment(String key) {
            long val = Long.parseLong(storage.getOrDefault(key, "0")) + 1;
            storage.put(key, String.valueOf(val));
            return val;
        }

        public void set(String key, String value, long timeout, java.util.concurrent.TimeUnit unit) {}
        public void set(String key, String value, java.time.Duration timeout) {}
        public Boolean setIfAbsent(String key, String value) { return true; }
        public Boolean setIfAbsent(String key, String value, long timeout, java.util.concurrent.TimeUnit unit) { return true; }
        public Boolean setIfAbsent(String key, String value, java.time.Duration timeout) { return true; }
        public Boolean setIfPresent(String key, String value) { return true; }
        public Boolean setIfPresent(String key, String value, long timeout, java.util.concurrent.TimeUnit unit) { return true; }
        public Boolean setIfPresent(String key, String value, java.time.Duration timeout) { return true; }
        public void multiSet(Map<? extends String, ? extends String> map) {}
        public Boolean multiSetIfAbsent(Map<? extends String, ? extends String> map) { return true; }
        public java.util.List<String> multiGet(java.util.Collection<String> keys) { return null; }
        public Long increment(String key, long delta) { return 0L; }
        public Double increment(String key, double delta) { return 0.0; }
        public Long decrement(String key) { return 0L; }
        public Long decrement(String key, long delta) { return 0L; }
        public Integer append(String key, String value) { return 0; }
        public String get(String key, long start, long end) { return null; }
        public void set(String key, String value, long offset) {}
        public Long size(String key) { return 0L; }
        public Boolean setBit(String key, long offset, boolean value) { return true; }
        public Boolean getBit(String key, long offset) { return true; }
        public java.util.List<Long> bitField(String key, org.springframework.data.redis.connection.BitFieldSubCommands subCommands) { return null; }
        public String getAndDelete(String key) { return null; }
        public String getAndExpire(String key, long timeout, java.util.concurrent.TimeUnit unit) { return null; }
        public String getAndExpire(String key, java.time.Duration timeout) { return null; }
        public String getAndPersist(String key) { return null; }
        public String getAndSet(String key, String value) { return null; }
        public org.springframework.data.redis.core.RedisOperations<String, String> getOperations() { return null; }
    }
}
