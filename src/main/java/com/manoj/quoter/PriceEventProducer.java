package com.manoj.quoter;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.concurrent.CompletableFuture;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true")
public class PriceEventProducer {

    private static final Logger log   = LoggerFactory.getLogger(PriceEventProducer.class);
    private static final String TOPIC = "price-feed";

    private final KafkaTemplate<String, String> kafka;
    private final Counter publishedCounter;
    private final Counter failedCounter;

    public PriceEventProducer(KafkaTemplate<String, String> kafka, MeterRegistry metrics) {
        this.kafka            = kafka;
        this.publishedCounter = Counter.builder("quoter.kafka.published")
                .description("Price events published to Kafka").register(metrics);
        this.failedCounter    = Counter.builder("quoter.kafka.failed")
                .description("Price events that failed to publish").register(metrics);
    }

    public void publish(String symbol, BigDecimal price) {
        String payload = symbol + ":" + price.toPlainString();
        CompletableFuture<SendResult<String, String>> future =
                kafka.send(TOPIC, symbol, payload);
        future.whenComplete((result, ex) -> {
            if (ex != null) {
                failedCounter.increment();
                log.error("Failed to publish price event symbol={} error={}", symbol, ex.getMessage());
            } else {
                publishedCounter.increment();
                log.debug("Published symbol={} offset={}", symbol,
                        result.getRecordMetadata().offset());
            }
        });
    }
}
