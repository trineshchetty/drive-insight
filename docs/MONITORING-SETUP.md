# Monitoring & Observability Setup Guide

This guide shows you how to enable Grafana Cloud monitoring in **development** so you can test logs and metrics shipping.

## Quick Start: Enable Monitoring in Development

### Step 1: Create Grafana Cloud Account

1. Go to https://grafana.com/auth/sign-up/create-user
2. Create a free account (Grafana Cloud free tier is perfect for development)
3. Complete onboarding

### Step 2: Configure Loki (Logs)

1. In Grafana Cloud, navigate to **Connections** → **Add new connection**
2. Search for and select **Hosted logs** (Loki)
3. You'll see your Loki credentials:
   ```
   URL: https://logs-prod-XXX.grafana.net
   Username: <your-user-id>
   Password: <your-api-key>
   ```
4. Copy these values to your `.env` file:
   ```bash
   LOKI_HOST=https://logs-prod-XXX.grafana.net
   LOKI_USERNAME=your-loki-user-id
   LOKI_PASSWORD=your-loki-api-key
   ```

### Step 3: Configure Prometheus (Metrics) with Grafana Agent

**Important:** Grafana Cloud uses Prometheus Remote Write protocol, which requires Grafana Agent to scrape our `/api/metrics` endpoint and push to Grafana Cloud.

1. In Grafana Cloud, navigate to **Connections** → **Add new connection**
2. Search for and select **Hosted metrics** (Prometheus)
3. You'll see your Prometheus remote-write endpoint and credentials:
   ```
   Remote Write Endpoint: https://prometheus-prod-XXX.grafana.net/api/prom/push
   Username: <your-user-id>
   Password: <your-api-key>
   ```
4. Copy these values to your `.env` file:
   ```bash
   PROMETHEUS_PUSH_GATEWAY=https://prometheus-prod-XXX.grafana.net/api/prom/push
   PROMETHEUS_USERNAME=your-prometheus-user-id
   PROMETHEUS_PASSWORD=your-prometheus-api-key
   ```

**Note:** Despite the name `PROMETHEUS_PUSH_GATEWAY`, we use Grafana Agent to handle the actual remote-write protocol.

### Step 4: Start Services with Grafana Agent

**Option A: With Grafana Agent (Recommended for full monitoring)**
```bash
docker-compose -f docker-compose.yml -f docker-compose.grafana-agent.yml up -d
```

This starts:
- API container (exposes metrics at `/api/metrics`)
- Grafana Agent (scrapes API every 15s and pushes to Grafana Cloud)

**Option B: API Only (Logs work, metrics viewable locally)**
```bash
docker-compose up -d api
```

- ✅ Logs ship to Grafana Cloud Loki
- ✅ Metrics available at `http://localhost:3005/api/metrics`
- ❌ Metrics NOT pushed to Grafana Cloud (no agent running)

### Step 5: Verify Logs in Grafana Cloud

1. In Grafana Cloud, go to **Explore**
2. Select your **Loki** data source
3. Run this query:
   ```logql
   {app="drive-insight-api"}
   ```
4. You should see logs appearing within 30 seconds

**Log labels available:**
- `app`: "drive-insight-api"
- `environment`: "development"
- `tenant_id`: Will be populated when authentication is implemented

### Step 6: Verify Metrics in Grafana Cloud

**Prerequisites:** Grafana Agent must be running (see Step 4, Option A)

1. In Grafana Cloud, go to **Explore**
2. Select your **Prometheus** data source
3. Run this query to see HTTP requests:
   ```promql
   http_requests_total{job="drive-insight-api"}
   ```
4. Or check request duration:
   ```promql
   rate(http_request_duration_seconds_sum[1m])
   ```

Grafana Agent scrapes the API **every 15 seconds** and pushes to Grafana Cloud.

**Available metrics:**
- `http_request_duration_seconds` - HTTP request latency histogram
- `http_requests_total` - Total HTTP requests counter
- `conversations_total` - Conversations created (will be used in later stories)
- `llm_cost_total` - LLM API costs tracking (will be used in later stories)

### Step 7: Access Local Metrics Endpoint

Even without Grafana Cloud, you can view metrics locally:

```bash
curl http://localhost:3005/api/metrics
```

This shows all Prometheus metrics in text format.

## Swagger API Documentation

Access Swagger docs (only available in development):

```
http://localhost:3005/api/docs
```

## Testing the Monitoring Setup

### Generate Test Logs

```bash
# Make requests to the API
curl http://localhost:3005/api/health
curl http://localhost:3005/api/metrics

# Check console for log output
docker-compose logs -f api
```

### Generate Test Metrics

```bash
# Make multiple requests to populate metrics
for i in {1..10}; do
  curl http://localhost:3005/api/health
  sleep 1
done

# Wait 15 seconds for metrics to push
sleep 15

# Query metrics in Grafana Cloud Explore
```

## Alerting (Grafana Cloud UI Configuration)

Alerts must be configured in the Grafana Cloud UI:

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Set up error rate alert:
   - **Query:** `rate(http_requests_total{status_code=~"5.."}[5m]) > 10`
   - **Condition:** Alert when above threshold for 5 minutes
   - **Contact point:** Create Slack contact point with your webhook URL

3. Save the alert rule

## Troubleshooting

### Logs not appearing in Loki?

- Check API container logs: `docker-compose logs api`
- Verify Loki credentials are correct in `.env`
- Ensure `LOKI_HOST` doesn't have trailing slash
- Check for "Loki connection error" in logs

### Metrics not appearing in Prometheus?

- Check API startup logs for "Starting Prometheus metrics push"
- Verify `PROMETHEUS_PUSH_GATEWAY` ends with `/api/prom/push`
- Check credentials are correct
- View metrics locally first: `curl http://localhost:3005/api/metrics`
- Look for "Failed to push metrics" errors in logs

### Docker container can't reach Grafana Cloud?

- Ensure container has internet access
- Check firewall settings
- Try `docker-compose exec api curl -v https://grafana.com`

## What's Next?

Once monitoring is working in development:

1. ✅ You've validated Loki logs shipping
2. ✅ You've validated Prometheus metrics pushing
3. ✅ You've confirmed Swagger docs working
4. 🔄 Next: Configure Grafana alert rules in UI
5. 🔄 Next: Implement tenant_id middleware (will populate tenant labels)
6. 🔄 Next: Write comprehensive tests

## Architecture Notes

### Why HTTP Push Instead of Scraping?

Grafana Cloud uses a **remote-write protocol** (HTTP push) instead of traditional Prometheus scraping:

- **Push model:** API pushes metrics to Grafana Cloud every 15 seconds
- **No Prometheus server needed:** Grafana Cloud handles storage and querying
- **Works with ephemeral containers:** No need for persistent scrape targets

### Why Winston-Loki Instead of Grafana Agent?

For simplicity in development, we use `winston-loki` transport:

- **Direct integration:** Logs ship from Winston to Loki without intermediate agents
- **Development-friendly:** No additional containers or processes needed
- **Production:** Consider using Grafana Agent or Promtail for better reliability

---

**Story:** 0-4-monitoring-observability-setup
**Status:** In Progress
**Last Updated:** 2026-02-26
