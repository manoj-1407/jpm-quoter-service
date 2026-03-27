package com.manoj.quoter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Random;

@Component
public class MockPriceProvider implements PriceProvider {

    private static final Logger log = LoggerFactory.getLogger(MockPriceProvider.class);
    private final Random rng = new Random();

    @Override
    public BigDecimal fetchPrice(String symbol) {
        if (rng.nextDouble() < 0.60) {
            log.warn("Feed unavailable for symbol={}", symbol);
            throw new RuntimeException("External feed unavailable for " + symbol);
        }
        double base = switch (symbol) {
            case "AAPL" -> 189.0;
            case "MSFT" -> 415.0;
            case "BTC"  -> 67500.0;
            case "ETH"  -> 3500.0;
            case "TSLA" -> 248.0;
            default     -> 100.0;
        };
        double jitter = (rng.nextDouble() - 0.5) * 10;
        BigDecimal price = BigDecimal.valueOf(base + jitter).setScale(4, RoundingMode.HALF_UP);
        log.info("Feed returned symbol={} price={}", symbol, price);
        return price;
    }
}
