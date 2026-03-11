# 🚀 Quick Start: Enable Monitoring in Development

## TL;DR

```bash
# 1. Add Grafana Cloud credentials to .env (see below)
# 2. Start with Grafana Agent
docker-compose -f docker-compose.yml -f docker-compose.grafana-agent.yml up -d

# 3. Generate traffic
curl http://localhost:3005/api/health

# 4. Check Grafana Cloud Explore within 30 seconds
```

## Get Grafana Cloud Credentials (5 minutes)

### Loki (Logs)
1. Go to https://grafana.com/auth/sign-up/create-user (free account)
2. Navigate to **Connections** → **Hosted logs**
3. Copy credentials to `.env`:
   ```bash
   LOKI_HOST=https://logs-prod-XXX.grafana.net
   LOKI_USERNAME=your-user-id
   LOKI_PASSWORD=your-api-key
   ```

### Prometheus (Metrics)
1. In Grafana Cloud, go to **Connections** → **Hosted metrics**
2. Copy remote-write credentials to `.env`:
   ```bash
   PROMETHEUS_PUSH_GATEWAY=https://prometheus-prod-XXX.grafana.net/api/prom/push
   PROMETHEUS_USERNAME=your-user-id
   PROMETHEUS_PASSWORD=your-api-key
   ```

## Architecture: How It Works

```
┌─────────────────────────────────────────────────────┐
│                  Your Development Machine            │
│                                                      │
│  ┌──────────────┐                                   │
│  │   API        │  /api/metrics (Prometheus format) │
│  │ Container    │────────┐                          │
│  │              │        │  scrape every 15s        │
│  └──────────────┘        │                          │
│         │                ▼                           │
│         │         ┌──────────────┐                   │
│         │         │   Grafana    │                   │
│         │         │    Agent     │                   │
│         │         │  Container   │                   │
│         │         └──────────────┘                   │
│         │                │                           │
│         │ winston-loki   │ remote-write (protobuf)  │
│         │   (HTTP)       │                           │
└─────────┼────────────────┼───────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────┐
│              Grafana Cloud (SaaS)                    │
│                                                      │
│  ┌──────────────┐         ┌──────────────┐          │
│  │     Loki     │         │  Prometheus  │          │
│  │ (Log Storage)│         │   (Metrics)  │          │
│  └──────────────┘         └──────────────┘          │
│                                                      │
│  Query via Grafana Explore or Dashboards            │
└─────────────────────────────────────────────────────┘
```

## What Gets Monitored?

### Logs (via winston-loki)
- ✅ All application logs ship directly to Grafana Cloud Loki
- ✅ Labels: `app`, `environment`, `tenant_id` (when auth implemented)
- ✅ Works in **development AND production**
- ✅ Logs visible within **30 seconds**

### Metrics (via Grafana Agent scraping)
- ✅ API exposes metrics at `/api/metrics` endpoint
- ✅ Grafana Agent scrapes every **15 seconds**
- ✅ Pushes to Grafana Cloud using remote-write protocol
- ✅ Works in **development AND production**

## Test It

### 1. Check Logs
```bash
# In Grafana Cloud Explore (Loki):
{app="drive-insight-api"}
```

### 2. Check Metrics
```bash
# In Grafana Cloud Explore (Prometheus):
http_requests_total{job="drive-insight-api"}
rate(http_request_duration_seconds_sum[1m])
```

### 3. Local Metrics Endpoint
```bash
curl http://localhost:3005/api/metrics
```

## Troubleshooting

### Logs not appearing?
```bash
# Check API logs for Loki connection
docker-compose logs api | grep -i loki

# Should see: "Loki transport initialized" (no errors)
```

### Metrics not appearing?
```bash
# Verify local metrics endpoint works
curl http://localhost:3005/api/metrics

# Check Grafana Agent is running
docker-compose -f docker-compose.yml -f docker-compose.grafana-agent.yml ps

# Check agent logs
docker-compose logs grafana-agent
```

## Production Deployment

For production, deploy Grafana Agent as a sidecar or separate service:

```yaml
# In production Kubernetes/ECS/etc:
- API container: Exposes /api/metrics
- Grafana Agent sidecar: Scrapes and pushes to Grafana Cloud
```

No changes needed in API code - same `/api/metrics` endpoint works everywhere!

---

**Full Documentation:** See `MONITORING-SETUP.md` for detailed setup and configuration.
