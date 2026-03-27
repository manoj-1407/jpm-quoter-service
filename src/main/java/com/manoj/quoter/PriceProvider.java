package com.manoj.quoter;

import java.math.BigDecimal;

public interface PriceProvider {
    BigDecimal fetchPrice(String symbol);
}
