package com.manoj.quoter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = {
        org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration.class,
        org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration.class
})
@EnableCaching
@EnableAsync
public class QuoterApplication {
    public static void main(String[] args) {
        SpringApplication.run(QuoterApplication.class, args);
    }
}
