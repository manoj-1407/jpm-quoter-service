package com.manoj.quoter;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.regex.Pattern;

@Component
public class InputSanitizer {

    private static final int MAX_SYMBOL_LENGTH = 10;
    private static final BigDecimal MAX_PRICE  = new BigDecimal("9999999.9999");
    private static final Pattern SYMBOL_PATTERN = Pattern.compile("^[A-Z0-9]{1,10}$");

    public String sanitizeSymbol(String raw) {
        if (raw == null || raw.isBlank())
            throw new IllegalArgumentException("Symbol cannot be empty");
        String upper = raw.trim().toUpperCase();
        if (upper.length() > MAX_SYMBOL_LENGTH)
            throw new IllegalArgumentException("Symbol too long — max 10 characters");
        if (!SYMBOL_PATTERN.matcher(upper).matches())
            throw new IllegalArgumentException("Symbol must contain only uppercase letters and digits");
        return upper;
    }

    public BigDecimal sanitizePrice(String raw) {
        if (raw == null || raw.isBlank())
            throw new IllegalArgumentException("Price cannot be empty");
        BigDecimal price;
        try {
            price = new BigDecimal(raw.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Price must be a valid decimal number");
        }
        if (price.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Price must be positive");
        if (price.compareTo(MAX_PRICE) > 0)
            throw new IllegalArgumentException("Price exceeds maximum allowed value");
        if (price.scale() > 4)
            throw new IllegalArgumentException("Price cannot have more than 4 decimal places");
        return price;
    }
}
