# Sentinel — Kubernetes Observability for jpm-quoter-service

> Production-grade k3s deployment with custom Prometheus alerting and the **Sentinel** React dashboard.

## Architecture

```
WSL2 (Ubuntu)
└── k3s
    ├── namespace: quoter
    │   ├── jpm-quoter (Deployment, HPA 1–3 pods)
    │   ├── postgres (StatefulSet + PVC 2Gi)
    │   ├── kafka + zookeeper
    │   └── sentinel-ui (custom React dashboard)
    └── namespace: monitoring
        ├── prometheus (kube-prometheus-stack)
        ├── grafana
        └── alertmanager
```

## Quick Start

```bash
# One-shot full deploy
chmod +x deploy.sh
./deploy.sh all

# Or phase by phase
./deploy.sh 1   # k3s install
./deploy.sh 2   # patch P1 app
./deploy.sh 3   # apply manifests
...
./deploy.sh 10  # this file
```

## Prerequisites

- WSL2 Ubuntu 22.04+
- Docker Desktop (with WSL2 integration)
- 8 GB RAM free
- `curl`, `git`, `java 17`

## Access

| Service | URL |
|---------|-----|
| Sentinel dashboard | http://sentinel.local |
| Quoter API | http://quoter.local |
| Grafana | `kubectl port-forward svc/kube-prom-grafana 3000:80 -n monitoring` |
| Prometheus | `kubectl port-forward svc/kube-prom-prometheus 9090:9090 -n monitoring` |
| Alertmanager | `kubectl port-forward svc/kube-prom-alertmanager 9093:9093 -n monitoring` |

Add to `/etc/hosts`:
```
127.0.0.1 quoter.local sentinel.local
```

## Grafana Panels

Import `monitoring/grafana-dashboard.json` for 5 pre-built panels:

1. **Circuit Breaker State** — resilience4j state gauge (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
2. **Request Rate** — `sum(rate(http_server_requests_seconds_count[1m]))`
3. **Error Rate %** — 5xx percentage over time
4. **Latency P50/P95/P99** — histogram quantiles
5. **HikariCP Pool** — active / idle / pending connections

## Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| CircuitBreakerOpen | `state == 2` for 30s | critical |
| CircuitBreakerHalfOpen | `state == 1` for 60s | warning |
| HighP99Latency | P99 > 1s for 2m | warning |
| HighErrorRate | 5xx > 5% for 2m | critical |
| QuoterPodCrashLooping | restart rate > 0 for 5m | critical |
| HikariPoolExhausted | pending > 3 for 1m | warning |

## Security

- Non-root containers (UID 1000)
- Read-only root filesystems where possible
- Default-deny NetworkPolicy in `quoter` namespace
- RBAC with least-privilege ServiceAccount
- No hardcoded secrets — all from K8s Secret
- Pod Disruption Budget: minAvailable=1
- Seccomp: RuntimeDefault on all pods

## Stress Testing

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Port-forward and hammer
kubectl port-forward svc/quoter-svc 8080:80 -n quoter &
hey -z 60s -c 20 http://localhost:8080/api/quotes

# Watch HPA
kubectl get hpa -n quoter -w

# Trip circuit breaker manually
curl -X POST http://localhost:8080/actuator/circuitbreakers/priceFeed/transition \
  -H 'Content-Type: application/json' -d '{"targetState":"FORCED_OPEN"}'
```

## Cleanup

```bash
# Remove all deployed resources
kubectl delete namespace quoter monitoring

# Uninstall k3s
/usr/local/bin/k3s-uninstall.sh
```
