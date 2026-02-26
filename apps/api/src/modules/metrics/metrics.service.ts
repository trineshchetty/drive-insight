import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';
import { LoggerService } from '../logger';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: client.Registry;

  // HTTP Metrics
  public readonly httpRequestDuration: client.Histogram;
  public readonly httpRequestsTotal: client.Counter;

  // Business Metrics
  public readonly conversationsTotal: client.Counter;
  public readonly llmCostTotal: client.Counter;

  private pushInterval?: NodeJS.Timeout;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('MetricsService');

    // Create a new registry
    this.registry = new client.Registry();

    // Add default metrics (memory, CPU, etc.)
    client.collectDefaultMetrics({ register: this.registry });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // HTTP Requests Total Counter
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
      registers: [this.registry],
    });

    // Conversations Total Counter
    this.conversationsTotal = new client.Counter({
      name: 'conversations_total',
      help: 'Total number of conversations created',
      labelNames: ['tenant_id', 'channel'],
      registers: [this.registry],
    });

    // LLM Cost Total Counter
    this.llmCostTotal = new client.Counter({
      name: 'llm_cost_total',
      help: 'Cumulative LLM API costs in USD',
      labelNames: ['tenant_id', 'model'],
      registers: [this.registry],
    });
  }

  async onModuleInit() {
    // Start pushing metrics to Grafana Cloud if configured
    if (this.isPushGatewayConfigured()) {
      this.startPushingMetrics();
    } else {
      this.logger.warn('Prometheus Push Gateway not configured. Metrics will only be available via /metrics endpoint.');
    }
  }

  private isPushGatewayConfigured(): boolean {
    return !!(
      process.env.PROMETHEUS_PUSH_GATEWAY &&
      process.env.PROMETHEUS_USERNAME &&
      process.env.PROMETHEUS_PASSWORD
    );
  }

  private startPushingMetrics() {
    // IMPORTANT: Grafana Cloud Prometheus uses Remote Write protocol (Protobuf + Snappy)
    // which is NOT supported by prom-client directly.
    //
    // SOLUTION: Metrics are exposed via /api/metrics endpoint.
    // Use Grafana Agent to scrape and push to Grafana Cloud.
    //
    // See docker-compose-grafana-agent.yml for setup instructions.

    this.logger.info('Prometheus metrics exposed at /api/metrics endpoint');
    this.logger.info(
      'To push to Grafana Cloud: Deploy Grafana Agent to scrape /api/metrics and handle remote-write'
    );
    this.logger.warn(
      'PROMETHEUS_PUSH_GATEWAY configured but direct push not supported. ' +
      'Metrics available at /api/metrics for scraping.'
    );
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Helper methods for recording metrics
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    tenantId?: string,
  ) {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      tenant_id: tenantId || 'unknown',
    };

    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestsTotal.inc(labels);
  }

  recordConversation(tenantId: string, channel: string) {
    this.conversationsTotal.inc({ tenant_id: tenantId, channel });
  }

  recordLLMCost(tenantId: string, model: string, cost: number) {
    this.llmCostTotal.inc({ tenant_id: tenantId, model }, cost);
  }

  // Cleanup on module destroy
  onModuleDestroy() {
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
    }
  }
}
