package com.manoj.quoter;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class PriceEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(PriceEventConsumer.class);

    private final QuoteRepository   repo;
    private final Counter           consumedCounter;
    private final Counter           malformedCounter;

    public PriceEventConsumer(QuoteRepository repo, MeterRegistry metrics) {
        this.repo             = repo;
        this.consumedCounter  = Counter.builder("quoter.kafka.consumed")
                .description("Price events consumed from Kafka").register(metrics);
        this.malformedCounter = Counter.builder("quoter.kafka.malformed")
                .description("Malformed price events skipped").register(metrics);
    }

    @KafkaListener(topics = "price-feed", groupId = "quoter-group",
                   containerFactory = "kafkaListenerContainerFactory")
    public void consume(ConsumerRecord<String, String> record, Acknowledgment ack) {
        String message = record.value();
        try {
            String[] parts = message.split(":", 2);
            if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
                malformedCounter.increment();
                log.warn("Skipping malformed message offset={} value={}", record.offset(), message);
                ack.acknowledge();
                return;
            }
            String symbol = parts[0];
            BigDecimal price = new BigDecimal(parts[1]);
            repo.save(new Quote(symbol, price));
            consumedCounter.increment();
            log.info("Consumed symbol={} price={} offset={}", symbol, price, record.offset());
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error processing message offset={} value={} error={}",
                    record.offset(), message, e.getMessage());
        }
    }
}
