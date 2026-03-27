package com.manoj.quoter;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "quotes", indexes = {
    @Index(name = "idx_quotes_symbol", columnList = "symbol"),
    @Index(name = "idx_quotes_timestamp", columnList = "timestamp DESC")
})
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String symbol;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal price;

    @Column(nullable = false)
    private long timestamp;

    public Quote() {}

    public Quote(String symbol, BigDecimal price) {
        this.symbol    = symbol;
        this.price     = price;
        this.timestamp = System.currentTimeMillis();
    }

    public Long getId()          { return id; }
    public String getSymbol()    { return symbol; }
    public BigDecimal getPrice() { return price; }
    public long getTimestamp()   { return timestamp; }
}
