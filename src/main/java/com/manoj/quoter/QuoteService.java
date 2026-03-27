package com.manoj.quoter;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class QuoteService {

    private static final Logger log = LoggerFactory.getLogger(QuoteService.class);

    private final QuoteRepository    repo;
    private final PriceProvider      priceProvider;
    private final PriceEventProducer producer;
    private final InputSanitizer     sanitizer;
    private final Counter            circuitOpenCounter;
    private final Counter            fallbackServedCounter;
    private final Timer              fetchTimer;

    private volatile BigDecimal lastKnownPrice = BigDecimal.valueOf(100.0);

    public QuoteService(QuoteRepository repo,
                        PriceProvider priceProvider,
                        PriceEventProducer producer,
                        InputSanitizer sanitizer,
                        MeterRegistry metrics) {
        this.repo                  = repo;
        this.priceProvider         = priceProvider;
        this.producer              = producer;
        this.sanitizer             = sanitizer;
        this.circuitOpenCounter    = Counter.builder("quoter.circuit.open.count")
                .description("Number of times circuit opened").register(metrics);
        this.fallbackServedCounter = Counter.builder("quoter.fallback.served")
                .description("Number of fallback prices served").register(metrics);
        this.fetchTimer            = Timer.builder("quoter.fetch.duration")
                .description("Time to fetch from price feed").register(metrics);
    }

    @CircuitBreaker(name = "priceFeed", fallbackMethod = "fallbackPrice")
    @CacheEvict(value = "quotes", key = "#symbol.toUpperCase()")
    @Transactional
    public Quote fetchAndSave(String symbol) {
        String clean = sanitizer.sanitizeSymbol(symbol);
        return fetchTimer.record(() -> {
            BigDecimal price = priceProvider.fetchPrice(clean);
            lastKnownPrice = price;
            Quote saved = repo.save(new Quote(clean, price));
            producer.publish(clean, price);
            log.info("Fetched, saved and published symbol={} price={} id={}", clean, price, saved.getId());
            return saved;
        });
    }

    public Quote fallbackPrice(String symbol, Throwable t) {
        String reason = t.getClass().getSimpleName();
        fallbackServedCounter.increment();
        if (reason.contains("CallNotPermittedException")) {
            circuitOpenCounter.increment();
        }
        String clean = symbol.toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (clean.length() > 8) clean = clean.substring(0, 8);
        String fallbackSymbol = clean + "_FALLBACK";
        log.warn("Serving fallback symbol={} reason={} price={}", fallbackSymbol, reason, lastKnownPrice);
        return new Quote(fallbackSymbol, lastKnownPrice);
    }

    @CacheEvict(value = "quotes", key = "#symbol.toUpperCase()")
    @Transactional
    public Quote save(String symbol, BigDecimal price) {
        String clean     = sanitizer.sanitizeSymbol(symbol);
        BigDecimal valid = sanitizer.sanitizePrice(price.toPlainString());
        Quote saved = repo.save(new Quote(clean, valid));
        log.info("Saved quote symbol={} price={} id={}", clean, valid, saved.getId());
        return saved;
    }

    @Cacheable(value = "quotes", key = "#symbol.toUpperCase()")
    @Transactional(readOnly = true)
    public List<Quote> getBySymbol(String symbol) {
        String clean = sanitizer.sanitizeSymbol(symbol);
        return repo.findBySymbolOrderByTimestampDesc(clean, PageRequest.of(0, 50));
    }
}
