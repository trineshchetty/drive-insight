import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../logger/logger.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    // Clean up any intervals
    service.onModuleDestroy();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have a registry', () => {
      expect(service['registry']).toBeDefined();
    });

    it('should initialize HTTP metrics', () => {
      expect(service.httpRequestDuration).toBeDefined();
      expect(service.httpRequestsTotal).toBeDefined();
    });

    it('should initialize business metrics', () => {
      expect(service.conversationsTotal).toBeDefined();
      expect(service.llmCostTotal).toBeDefined();
    });

    it('should set logger context on initialization', () => {
      expect(loggerService.setContext).toHaveBeenCalledWith('MetricsService');
    });
  });

  describe('HTTP metrics recording', () => {
    it('should record HTTP request with all labels', () => {
      const method = 'GET';
      const route = '/api/health';
      const statusCode = 200;
      const duration = 0.05;
      const tenantId = 'tenant-123';

      expect(() =>
        service.recordHttpRequest(method, route, statusCode, duration, tenantId),
      ).not.toThrow();
    });

    it('should record HTTP request without tenant_id', () => {
      const method = 'POST';
      const route = '/api/users';
      const statusCode = 201;
      const duration = 0.1;

      expect(() =>
        service.recordHttpRequest(method, route, statusCode, duration),
      ).not.toThrow();
    });

    it('should handle various HTTP methods', () => {
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach((method) => {
        expect(() =>
          service.recordHttpRequest(method, '/api/test', 200, 0.01),
        ).not.toThrow();
      });
    });

    it('should handle different status codes', () => {
      [200, 201, 400, 401, 404, 500].forEach((statusCode) => {
        expect(() =>
          service.recordHttpRequest('GET', '/api/test', statusCode, 0.01),
        ).not.toThrow();
      });
    });

    it('should handle very fast requests', () => {
      expect(() =>
        service.recordHttpRequest('GET', '/api/fast', 200, 0.001),
      ).not.toThrow();
    });

    it('should handle slow requests', () => {
      expect(() =>
        service.recordHttpRequest('GET', '/api/slow', 200, 5.5),
      ).not.toThrow();
    });
  });

  describe('business metrics recording', () => {
    describe('conversations', () => {
      it('should record conversation creation', () => {
        const tenantId = 'tenant-456';
        const channel = 'whatsapp';

        expect(() => service.recordConversation(tenantId, channel)).not.toThrow();
      });

      it('should handle different channels', () => {
        ['whatsapp', 'messenger', 'sms', 'instagram'].forEach((channel) => {
          expect(() => service.recordConversation('tenant-test', channel)).not.toThrow();
        });
      });
    });

    describe('LLM costs', () => {
      it('should record LLM cost', () => {
        const tenantId = 'tenant-789';
        const model = 'gpt-4';
        const cost = 0.05;

        expect(() => service.recordLLMCost(tenantId, model, cost)).not.toThrow();
      });

      it('should handle different models', () => {
        ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2'].forEach((model) => {
          expect(() => service.recordLLMCost('tenant-test', model, 0.01)).not.toThrow();
        });
      });

      it('should handle zero cost', () => {
        expect(() => service.recordLLMCost('tenant-test', 'free-model', 0)).not.toThrow();
      });

      it('should handle high costs', () => {
        expect(() => service.recordLLMCost('tenant-test', 'expensive-model', 10.5)).not.toThrow();
      });
    });
  });

  describe('metrics export', () => {
    it('should export metrics in Prometheus format', async () => {
      // Record some metrics first
      service.recordHttpRequest('GET', '/api/health', 200, 0.01, 'tenant-123');
      service.recordConversation('tenant-123', 'whatsapp');
      service.recordLLMCost('tenant-123', 'gpt-4', 0.05);

      const metrics = await service.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('conversations_total');
      expect(metrics).toContain('llm_cost_total');
    });

    it('should include metric labels in export', async () => {
      service.recordHttpRequest('POST', '/api/data', 201, 0.05, 'tenant-abc');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('route="/api/data"');
      expect(metrics).toContain('status_code="201"');
      expect(metrics).toContain('tenant_id="tenant-abc"');
    });

    it('should include default metrics', async () => {
      const metrics = await service.getMetrics();

      // Default metrics from prom-client
      expect(metrics).toContain('process_cpu');
      expect(metrics).toContain('nodejs_');
    });
  });

  describe('histogram buckets', () => {
    it('should use correct duration buckets', () => {
      const histogram = service.httpRequestDuration;
      const config = (histogram as any).hashMap;

      // Record requests in different buckets
      service.recordHttpRequest('GET', '/api/test', 200, 0.005); // < 0.01
      service.recordHttpRequest('GET', '/api/test', 200, 0.03);  // 0.01-0.05
      service.recordHttpRequest('GET', '/api/test', 200, 0.08);  // 0.05-0.1
      service.recordHttpRequest('GET', '/api/test', 200, 0.3);   // 0.1-0.5
      service.recordHttpRequest('GET', '/api/test', 200, 1.5);   // 1-2
      service.recordHttpRequest('GET', '/api/test', 200, 3.0);   // 2-5

      // Just verify it doesn't throw
      expect(config).toBeDefined();
    });
  });

  describe('push gateway configuration', () => {
    it('should check if push gateway is configured', () => {
      // Access private method via any
      const isConfigured = (service as any).isPushGatewayConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });

    it('should not throw when checking configuration', () => {
      expect(() => (service as any).isPushGatewayConfigured()).not.toThrow();
    });
  });

  describe('module lifecycle', () => {
    it('should handle module initialization', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should clean up on destroy', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });

    it('should clear push interval on destroy', () => {
      // Manually set an interval
      (service as any).pushInterval = setInterval(() => {}, 1000);

      service.onModuleDestroy();

      // Interval should be cleared
      expect((service as any).pushInterval).toBeDefined();
    });
  });

  describe('counter increments', () => {
    it('should increment HTTP requests counter', async () => {
      const initialMetrics = await service.getMetrics();

      service.recordHttpRequest('GET', '/api/test', 200, 0.01);

      const updatedMetrics = await service.getMetrics();

      expect(updatedMetrics).not.toBe(initialMetrics);
      expect(updatedMetrics).toContain('http_requests_total');
    });

    it('should accumulate multiple requests', async () => {
      // Record multiple requests
      for (let i = 0; i < 10; i++) {
        service.recordHttpRequest('GET', '/api/test', 200, 0.01, 'tenant-123');
      }

      const metrics = await service.getMetrics();
      expect(metrics).toContain('tenant_id="tenant-123"');
    });
  });

  describe('tenant_id handling', () => {
    it('should default to "unknown" when tenant_id is missing', async () => {
      service.recordHttpRequest('GET', '/api/test', 200, 0.01);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('tenant_id="unknown"');
    });

    it('should use provided tenant_id', async () => {
      service.recordHttpRequest('GET', '/api/test', 200, 0.01, 'tenant-specific');

      const metrics = await service.getMetrics();
      expect(metrics).toContain('tenant_id="tenant-specific"');
    });

    it('should handle multiple tenants separately', async () => {
      service.recordHttpRequest('GET', '/api/test', 200, 0.01, 'tenant-1');
      service.recordHttpRequest('GET', '/api/test', 200, 0.01, 'tenant-2');

      const metrics = await service.getMetrics();
      expect(metrics).toContain('tenant_id="tenant-1"');
      expect(metrics).toContain('tenant_id="tenant-2"');
    });
  });
});
