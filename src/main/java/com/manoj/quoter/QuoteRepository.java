package com.manoj.quoter;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuoteRepository extends JpaRepository<Quote, Long> {

    List<Quote> findBySymbolOrderByTimestampDesc(String symbol, Pageable pageable);
}
