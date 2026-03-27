package com.manoj.quoter;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/quotes")
public class QuoteController {

    private static final Logger log = LoggerFactory.getLogger(QuoteController.class);

    private final QuoteService       service;
    private final RateLimiterService rateLimiter;
    private final AuditService       audit;

    public QuoteController(QuoteService service,
                           RateLimiterService rateLimiter,
                           AuditService audit) {
        this.service     = service;
        this.rateLimiter = rateLimiter;
        this.audit       = audit;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body,
                                    HttpServletRequest req) {
        if (!checkRate(req)) return rateLimitResponse();
        String symbol    = body.get("symbol");
        BigDecimal price = new BigDecimal(body.get("price"));
        Quote saved      = service.save(symbol, price);
        audit.record(clientId(req), "QUOTE_CREATE", symbol,
            req.getRemoteAddr(), "price=" + price.toPlainString());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<?> get(@PathVariable String symbol,
                                 HttpServletRequest req) {
        if (!checkRate(req)) return rateLimitResponse();
        List<Quote> quotes = service.getBySymbol(symbol);
        audit.record(clientId(req), "QUOTE_READ", symbol, req.getRemoteAddr(), null);
        if (quotes.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(quotes);
    }

    @PostMapping("/fetch/{symbol}")
    public ResponseEntity<?> fetchFromFeed(@PathVariable String symbol,
                                           HttpServletRequest req) {
        if (!checkRate(req)) return rateLimitResponse();
        Quote q = service.fetchAndSave(symbol);
        audit.record(clientId(req), "QUOTE_FETCH", symbol,
            req.getRemoteAddr(), "source=MockPriceProvider");
        return ResponseEntity.ok(q);
    }

    private boolean checkRate(HttpServletRequest req) {
        return rateLimiter.tryConsume(clientId(req));
    }

    private String clientId(HttpServletRequest req) {
        Object id = req.getAttribute("clientId");
        return id != null ? id.toString() : "anon:" + req.getRemoteAddr();
    }

    private ResponseEntity<Map<String, Object>> rateLimitResponse() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
            "error",            "RATE_LIMIT_EXCEEDED",
            "message",          "Too many requests — limit is 20 per minute per client",
            "retryAfterSeconds", 60
        ));
    }
}
