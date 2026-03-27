package com.manoj.quoter;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuoteServiceTest {

    @Mock QuoteRepository   repo;
    @Mock PriceProvider     provider;
    @Mock PriceEventProducer producer;

    private QuoteService service;

    @BeforeEach
    void setUp() {
        service = new QuoteService(repo, provider, producer,
                new InputSanitizer(), new SimpleMeterRegistry());
    }

    @Test
    void saveValidQuoteReturnsSavedEntity() {
        Quote expected = new Quote("AAPL", new BigDecimal("189.50"));
        when(repo.save(any())).thenReturn(expected);
        Quote result = service.save("aapl", new BigDecimal("189.50"));
        assertThat(result.getSymbol()).isEqualTo("AAPL");
        verify(repo).save(any());
    }

    @Test
    void saveEmptySymbolThrows() {
        assertThatThrownBy(() -> service.save("", BigDecimal.ONE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void saveNegativePriceThrows() {
        assertThatThrownBy(() -> service.save("AAPL", new BigDecimal("-1")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positive");
    }

    @Test
    void fetchAndSavePublishesToKafkaAndReturnsFeed() {
        BigDecimal feedPrice = new BigDecimal("190.0000");
        Quote savedQuote = new Quote("AAPL", feedPrice);
        when(provider.fetchPrice("AAPL")).thenReturn(feedPrice);
        when(repo.save(any())).thenReturn(savedQuote);

        Quote result = service.fetchAndSave("AAPL");

        assertThat(result.getSymbol()).isEqualTo("AAPL");
        assertThat(result.getPrice()).isEqualByComparingTo(feedPrice);
        verify(producer).publish("AAPL", feedPrice);
    }

    @Test
    void fallbackReturnsFallbackSymbolWithLastKnownPrice() {
        Quote fallback = service.fallbackPrice("AAPL", new RuntimeException("feed down"));
        assertThat(fallback.getSymbol()).isEqualTo("AAPL_FALLBACK");
        assertThat(fallback.getPrice()).isEqualByComparingTo(new BigDecimal("100.0"));
    }

    @Test
    void getBySymbolDelegatesToRepository() {
        Quote q = new Quote("AAPL", new BigDecimal("189.00"));
        when(repo.findBySymbolOrderByTimestampDesc(eq("AAPL"), any(Pageable.class)))
                .thenReturn(List.of(q));
        List<Quote> result = service.getBySymbol("aapl");
        assertThat(result).hasSize(1);
    }

    @Test
    void getBySymbolNormalisesCase() {
        when(repo.findBySymbolOrderByTimestampDesc(eq("MSFT"), any(Pageable.class)))
                .thenReturn(List.of());
        service.getBySymbol("msft");
        verify(repo).findBySymbolOrderByTimestampDesc(eq("MSFT"), any(Pageable.class));
    }
}
