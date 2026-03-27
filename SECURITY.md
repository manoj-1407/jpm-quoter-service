# Security Policy

## Reporting a Vulnerability

Do not open a public issue for security vulnerabilities. Contact the maintainer directly.

## Credential Situation

Earlier commits contained a placeholder database password in docker-compose.yml.
This was a local development placeholder — not a production credential.
It has been scrubbed from git history via `git filter-repo`.

All secrets are now strictly required environment variables with no fallback defaults.
The application will fail to start if any required secret is absent.

## Security Controls

| Control | Implementation |
|---|---|
| JWT secret | Required env var `JWT_SECRET`, no default, fails startup if absent |
| DB password | Required env var `SPRING_DATASOURCE_PASSWORD`, never logged |
| CORS | Explicit origins via `CORS_ALLOWED_ORIGINS` — no wildcard |
| Rate limiting | Per-IP Bucket4j token bucket — 20 req/min, returns `X-RateLimit-*` headers |
| SQL injection | All queries via Spring Data JPA parameterized — zero string-concatenated SQL |
| Security headers | HSTS 1yr, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy: no-referrer |
| Stack traces | Never in API responses (`include-stacktrace: never`) |
| Session | Stateless JWT — no server-side sessions |
| Prometheus | `/actuator/prometheus` requires authentication in production |
