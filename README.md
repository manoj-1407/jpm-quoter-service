# JPM Quoter Service

Financial data API built around production resilience patterns. Fetches live price feeds, persists quotes to PostgreSQL, publishes events to Kafka, and serves cached results through a two-layer cache (Caffeine + Redis). Runs on Kubernetes with full observability.

## Architecture
```
Client → JWT Auth → Rate Limiting (Bucket4j) → Quoter API
                                                     ↓
                               Circuit Breaker (Resilience4j) → Price Feed
                                                     ↓
                                          PostgreSQL ← HikariCP
                                          Redis (L2 cache)
                                          Kafka (event stream)
```

## Stack

| Layer | Technology |
|---|---|
| Runtime | Java 17, Spring Boot 3.2.5 |
| Auth | Spring Security + JWT HS512 |
| Rate Limiting | Bucket4j 8.10.1 per-IP |
| Circuit Breaker | Resilience4j 2.2.0 |
| Cache | Caffeine (L1) + Redis (L2) |
| Database | PostgreSQL 16 + HikariCP |
| Messaging | Apache Kafka (KRaft, no ZooKeeper) |
| Observability | Prometheus + Grafana + Alertmanager |
| Dashboard | Sentinel (React) |
| Infra | k3s, Helm, Docker |

## Running Locally
```bash
# Prerequisites: Java 17, Docker, PostgreSQL, Redis, Kafka
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## Kubernetes Deploy
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh all
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

## Tests
```bash
mvn test
```

35 tests covering service logic, controller behaviour, auth, rate limiting, and audit endpoints.

## Security

- JWT HS512 with 64-byte minimum secret
- Per-IP rate limiting via Bucket4j
- Non-root containers (UID 1000) with read-only root filesystems
- Default-deny Kubernetes NetworkPolicy
- No credentials in repository — all secrets via GitHub Actions Secrets

## API

| Endpoint | Auth | Description |
|---|---|---|
| POST /auth/token | None | Issue JWT token |
| GET /quotes/{symbol} | JWT | Fetch live quote |
| GET /audit | JWT (ADMIN) | Paginated audit log |
| GET /actuator/health | None | Health check |
| GET /actuator/prometheus | None | Metrics scrape endpoint |
