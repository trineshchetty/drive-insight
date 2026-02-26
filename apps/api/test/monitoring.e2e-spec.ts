import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Monitoring Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/metrics (GET)', () => {
    it('should return Prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .expect((res) => {
          expect(res.text).toContain('# HELP');
          expect(res.text).toContain('# TYPE');
          expect(res.text).toContain('http_request_duration_seconds');
          expect(res.text).toContain('http_requests_total');
        });
    });

    it('should include default Node.js metrics', () => {
      return request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('process_cpu');
          expect(res.text).toContain('nodejs_');
        });
    });

    it('should track its own request in metrics', async () => {
      // Make initial request
      await request(app.getHttpServer()).get('/api/metrics').expect(200);

      // Check that the request was tracked
      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('method="GET"');
      expect(response.text).toContain('route="/api/metrics"');
      expect(response.text).toContain('status_code="200"');
    });
  });

  describe('HTTP Metrics Middleware', () => {
    it('should record metrics for health endpoint', async () => {
      // Make a health check request
      await request(app.getHttpServer()).get('/api/health').expect(200);

      // Check metrics
      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('route="/api/health"');
      expect(response.text).toContain('method="GET"');
      expect(response.text).toContain('status_code="200"');
    });

    it('should record duration for requests', async () => {
      await request(app.getHttpServer()).get('/api/health').expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('http_request_duration_seconds_sum');
      expect(response.text).toContain('http_request_duration_seconds_count');
    });

    it('should increment request counter', async () => {
      // Get initial metrics
      const initial = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      // Make several requests
      await request(app.getHttpServer()).get('/api/health').expect(200);
      await request(app.getHttpServer()).get('/api/health').expect(200);
      await request(app.getHttpServer()).get('/api/health').expect(200);

      // Get updated metrics
      const updated = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      // Should have more requests recorded
      expect(updated.text).toContain('http_requests_total');
      expect(updated.text.length).toBeGreaterThan(initial.text.length);
    });
  });

  describe('Tenant Context', () => {
    it('should extract tenant_id from X-Tenant-ID header', async () => {
      await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Tenant-ID', 'tenant-header-test')
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('tenant_id="tenant-header-test"');
    });

    it('should extract tenant_id from query parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/health?tenant_id=tenant-query-test')
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('tenant_id="tenant-query-test"');
    });

    it('should use "unknown" when no tenant_id provided', async () => {
      await request(app.getHttpServer()).get('/api/health').expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('tenant_id="unknown"');
    });

    it('should track metrics per tenant separately', async () => {
      // Make requests for different tenants
      await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Tenant-ID', 'tenant-alpha')
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Tenant-ID', 'tenant-beta')
        .expect(200);

      // Check metrics
      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('tenant_id="tenant-alpha"');
      expect(response.text).toContain('tenant_id="tenant-beta"');
    });

    it('should prioritize X-Tenant-ID header over query parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/health?tenant_id=query-tenant')
        .set('X-Tenant-ID', 'header-tenant')
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('tenant_id="header-tenant"');
      expect(response.text).not.toContain('tenant_id="query-tenant"');
    });
  });

  describe('Histogram Buckets', () => {
    it('should distribute requests across buckets', async () => {
      // Make several requests to generate histogram data
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/api/health').expect(200);
      }

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      // Check for histogram buckets
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="0.01"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="0.05"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="0.1"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="0.5"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="1"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="2"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="5"');
      expect(response.text).toContain('http_request_duration_seconds_bucket{le="+Inf"');
    });
  });

  describe('Error Handling', () => {
    it('should record metrics for 404 errors', async () => {
      await request(app.getHttpServer()).get('/api/nonexistent').expect(404);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('status_code="404"');
    });

    it('should track different status codes separately', async () => {
      // Make requests with different outcomes
      await request(app.getHttpServer()).get('/api/health').expect(200);
      await request(app.getHttpServer()).get('/api/notfound').expect(404);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('status_code="200"');
      expect(response.text).toContain('status_code="404"');
    });
  });

  describe('Middleware Order', () => {
    it('should apply tenant middleware before metrics middleware', async () => {
      // This test verifies that tenant_id is available when metrics are recorded
      await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Tenant-ID', 'middleware-order-test')
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);

      // If tenant_id is in metrics, middleware order is correct
      expect(response.text).toContain('tenant_id="middleware-order-test"');
    });
  });

  describe('Performance', () => {
    it('should handle high request volume', async () => {
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app.getHttpServer()).get('/api/health').expect(200),
        );
      }

      await Promise.all(requests);

      // Verify metrics endpoint still responds quickly
      const start = Date.now();
      await request(app.getHttpServer()).get('/api/metrics').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
