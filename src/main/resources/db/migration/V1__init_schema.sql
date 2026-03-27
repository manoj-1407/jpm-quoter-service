CREATE TABLE IF NOT EXISTS quotes (
    id        BIGSERIAL PRIMARY KEY,
    symbol    VARCHAR(10)   NOT NULL,
    price     NUMERIC(19,4) NOT NULL,
    timestamp BIGINT        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_symbol    ON quotes(symbol);
CREATE INDEX IF NOT EXISTS idx_quotes_timestamp ON quotes(timestamp DESC);
