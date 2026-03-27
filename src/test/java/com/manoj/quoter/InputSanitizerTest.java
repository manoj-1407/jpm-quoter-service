package com.manoj.quoter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.*;

class InputSanitizerTest {

    private InputSanitizer sanitizer;

    @BeforeEach
    void setUp() { sanitizer = new InputSanitizer(); }

    @Test
    void symbolNullThrows() {
        assertThatThrownBy(() -> sanitizer.sanitizeSymbol(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void symbolBlankThrows() {
        assertThatThrownBy(() -> sanitizer.sanitizeSymbol("  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void symbolTooLongThrows() {
        assertThatThrownBy(() -> sanitizer.sanitizeSymbol("TOOLONGSYMBOL"))
                .hasMessageContaining("max 10");
    }

    @ParameterizedTest
    @ValueSource(strings = {"<script>", "AA PL", "aa-pl", "AA.PL", "AA/PL"})
    void symbolInvalidCharsThrows(String sym) {
        assertThatThrownBy(() -> sanitizer.sanitizeSymbol(sym))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"AAPL", "BTC", "ETH", "MSFT", "A1B2"})
    void validSymbolNormalised(String sym) {
        assertThat(sanitizer.sanitizeSymbol(sym.toLowerCase())).isEqualTo(sym);
    }

    @Test
    void priceNullThrows() {
        assertThatThrownBy(() -> sanitizer.sanitizePrice(null))
                .hasMessageContaining("empty");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "-0.001", "0.0000"})
    void priceNotPositiveThrows(String p) {
        assertThatThrownBy(() -> sanitizer.sanitizePrice(p))
                .hasMessageContaining("positive");
    }

    @Test
    void priceTooManyDecimalsThrows() {
        assertThatThrownBy(() -> sanitizer.sanitizePrice("100.00001"))
                .hasMessageContaining("4 decimal");
    }

    @Test
    void validPriceReturned() {
        BigDecimal result = sanitizer.sanitizePrice("189.5000");
        assertThat(result).isEqualByComparingTo(new BigDecimal("189.5000"));
    }

    @Test
    void priceExceedsMaxThrows() {
        assertThatThrownBy(() -> sanitizer.sanitizePrice("99999999.9999"))
                .hasMessageContaining("maximum");
    }
}
