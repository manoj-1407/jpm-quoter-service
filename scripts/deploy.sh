#!/usr/bin/env bash
# deploy.sh — Sentinel full deployment for jpm-quoter-service
# Run from: ~/projects/jpm-quoter-service
# Usage: ./deploy.sh [phase]   e.g. ./deploy.sh 1  or  ./deploy.sh all
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${BLUE}[sentinel]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

PHASE="${1:-all}"

# ── Phase 1: k3s ───────────────────────────────────────────────────────────────
phase1() {
  log "Phase 1: Installing k3s in WSL2"

  if command -v k3s &>/dev/null; then
    ok "k3s already installed: $(k3s --version | head -1)"
  else
    log "Downloading k3s..."
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
    sudo chmod 644 /etc/rancher/k3s/k3s.yaml
    ok "k3s installed"
  fi

  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc

  log "Waiting for node to be Ready..."
  kubectl wait node --all --for=condition=Ready --timeout=90s
  ok "Node ready:"
  kubectl get nodes
}

# ── Phase 2: Patch P1 ──────────────────────────────────────────────────────────
phase2() {
  log "Phase 2: Patching pom.xml and application.yml"

  # Check micrometer dep
  if grep -q "micrometer-registry-prometheus" pom.xml; then
    ok "micrometer-registry-prometheus already in pom.xml"
  else
    log "Adding micrometer dep to pom.xml..."
    # Insert before </dependencies>
    sed -i 's|</dependencies>|    <dependency>\n            <groupId>io.micrometer</groupId>\n            <artifactId>micrometer-registry-prometheus</artifactId>\n        </dependency>\n    </dependencies>|' pom.xml
    ok "pom.xml patched"
  fi

  # Patch application.yml
  APP_YML="src/main/resources/application.yml"
  if grep -q "prometheus" "$APP_YML" 2>/dev/null; then
    ok "prometheus already in application.yml"
  else
    cat >> "$APP_YML" << 'YMLEOF'

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics,circuitbreakers
  endpoint:
    health:
      probes:
        add-additional-paths: true
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
YMLEOF
    ok "application.yml patched"
  fi

  log "Building project to verify..."
  ./mvnw package -DskipTests -q && ok "Build successful"
}

# ── Phase 3: Apply K8s manifests ───────────────────────────────────────────────
phase3() {
  log "Phase 3: Applying K8s manifests"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  kubectl apply -f k8s/namespace.yaml
  ok "Namespaces created"

  warn "Before continuing: edit k8s/secret-template.yaml with real passwords, then apply:"
  warn "  kubectl apply -f k8s/secret-template.yaml"
  read -rp "Have you applied the secret? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || die "Apply the secret first."

  kubectl apply -f k8s/configmap.yaml
  kubectl apply -f k8s/rbac.yaml
  kubectl apply -f k8s/network-policy.yaml
  kubectl apply -f k8s/pdb.yaml
  ok "Config + RBAC + NetworkPolicy + PDB applied"
}

# ── Phase 4: Deploy Postgres + Kafka ──────────────────────────────────────────
phase4() {
  log "Phase 4: Deploying PostgreSQL + Kafka"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  kubectl apply -f k8s/postgres/pvc.yaml
  kubectl apply -f k8s/postgres/deployment.yaml
  kubectl apply -f k8s/postgres/service.yaml

  log "Waiting for postgres..."
  kubectl wait deployment/postgres -n quoter --for=condition=Available --timeout=120s
  ok "PostgreSQL ready"

  kubectl apply -f k8s/kafka/zookeeper.yaml
  kubectl apply -f k8s/kafka/deployment.yaml

  log "Waiting for zookeeper..."
  kubectl wait deployment/zookeeper -n quoter --for=condition=Available --timeout=90s
  log "Waiting for kafka (this takes ~60s)..."
  kubectl wait deployment/kafka -n quoter --for=condition=Available --timeout=180s
  ok "Kafka ready"
}

# ── Phase 5: Build + deploy quoter ────────────────────────────────────────────
phase5() {
  log "Phase 5: Building Docker image + deploying quoter"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  log "Building Docker image..."
  docker build -t jpm-quoter:latest -f Dockerfile .
  ok "Image built"

  log "Loading image into k3s..."
  docker save jpm-quoter:latest | sudo k3s ctr images import -
  ok "Image loaded into k3s"

  kubectl apply -f k8s/deployment.yaml
  kubectl apply -f k8s/service.yaml
  kubectl apply -f k8s/ingress.yaml

  log "Waiting for quoter to be ready..."
  kubectl wait deployment/jpm-quoter -n quoter --for=condition=Available --timeout=120s
  ok "jpm-quoter deployed"

  log "Testing actuator:"
  kubectl port-forward svc/quoter-svc 8080:80 -n quoter &
  PF_PID=$!
  sleep 3
  curl -s http://localhost:8080/actuator/health | python3 -m json.tool || warn "actuator not responding yet"
  kill $PF_PID 2>/dev/null || true
}

# ── Phase 6: kube-prometheus-stack ────────────────────────────────────────────
phase6() {
  log "Phase 6: Installing kube-prometheus-stack via Helm"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  if ! command -v helm &>/dev/null; then
    log "Installing Helm..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  fi

  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm repo update

  helm upgrade --install kube-prom prometheus-community/kube-prometheus-stack \
    -n monitoring --create-namespace \
    -f monitoring/prometheus-values.yaml \
    --wait --timeout=10m

  ok "kube-prometheus-stack installed"
  kubectl get pods -n monitoring
}

# ── Phase 7: Alert rules ───────────────────────────────────────────────────────
phase7() {
  log "Phase 7: Applying Prometheus alert rules"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  kubectl apply -f monitoring/alert-rules.yaml
  ok "Alert rules applied"

  log "Verifying rules in Prometheus..."
  kubectl port-forward svc/kube-prom-prometheus 9090:9090 -n monitoring &
  PF_PID=$!
  sleep 3
  curl -s http://localhost:9090/api/v1/rules | python3 -c "
import json,sys
d=json.load(sys.stdin)
groups=d.get('data',{}).get('groups',[])
for g in groups:
    if 'quoter' in g.get('name','').lower() or 'circuit' in g.get('name','').lower():
        print('Found group:', g['name'])
        for r in g.get('rules',[]): print(' -', r['name'])
" || warn "Could not query Prometheus rules"
  kill $PF_PID 2>/dev/null || true
}

# ── Phase 8: HPA stress test ───────────────────────────────────────────────────
phase8() {
  log "Phase 8: Applying HPA + stress test"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  kubectl apply -f k8s/hpa.yaml
  ok "HPA applied"

  log "Current HPA status:"
  kubectl get hpa -n quoter

  log "Starting load test (watch pods in another terminal: kubectl get pods -n quoter -w)"
  log "Running 60s of load..."

  kubectl port-forward svc/quoter-svc 8080:80 -n quoter &
  PF_PID=$!
  sleep 2

  # Requires: apt install apache2-utils  (ab) or use hey
  if command -v hey &>/dev/null; then
    hey -z 60s -c 20 http://localhost:8080/actuator/health
  elif command -v ab &>/dev/null; then
    ab -t 60 -c 20 -n 100000 http://localhost:8080/actuator/health
  else
    warn "Neither 'hey' nor 'ab' found. Install: go install github.com/rakyll/hey@latest"
    warn "Simulating load with curl loop for 30s..."
    for i in $(seq 1 300); do curl -s http://localhost:8080/actuator/health > /dev/null; sleep 0.1; done
  fi

  kill $PF_PID 2>/dev/null || true
  log "Post-load HPA:"
  kubectl get hpa -n quoter
  kubectl get pods -n quoter
}

# ── Phase 9: Sentinel UI ───────────────────────────────────────────────────────
phase9() {
  log "Phase 9: Building + deploying Sentinel UI"
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  cd sentinel-ui
  npm ci
  npm run build
  cd ..

  docker build -t sentinel-ui:latest sentinel-ui/
  docker save sentinel-ui:latest | sudo k3s ctr images import -

  kubectl apply -f k8s/sentinel.yaml
  kubectl wait deployment/sentinel -n quoter --for=condition=Available --timeout=60s
  ok "Sentinel UI deployed"
  log "Access: http://sentinel.local (add to /etc/hosts: 127.0.0.1 sentinel.local)"
}

# ── Phase 10: DEPLOYMENT.md ───────────────────────────────────────────────────
phase10() {
  log "Phase 10: Generating DEPLOYMENT.md"
  cat > DEPLOYMENT.md << 'MDEOF'
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
MDEOF
  ok "DEPLOYMENT.md written"
}

# ── Runner ─────────────────────────────────────────────────────────────────────
case "$PHASE" in
  1) phase1 ;;
  2) phase2 ;;
  3) phase3 ;;
  4) phase4 ;;
  5) phase5 ;;
  6) phase6 ;;
  7) phase7 ;;
  8) phase8 ;;
  9) phase9 ;;
  10) phase10 ;;
  all)
    phase1; phase2; phase3; phase4
    phase5; phase6; phase7; phase8
    phase9; phase10
    echo ""
    ok "═══ Sentinel fully deployed ═══"
    echo -e "${CYAN}Sentinel UI:${NC}  http://sentinel.local"
    echo -e "${CYAN}Quoter API:${NC}   http://quoter.local"
    echo -e "${CYAN}Grafana:${NC}      kubectl port-forward svc/kube-prom-grafana 3000:80 -n monitoring"
    ;;
  *)
    echo "Usage: $0 [1-10|all]"
    exit 1
    ;;
esac
