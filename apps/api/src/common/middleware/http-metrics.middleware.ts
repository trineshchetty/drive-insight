import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../modules/metrics';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Capture tenant_id from request if available
    // This will be populated later when we add authentication
    const tenantId = (req as any).tenantId;

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const route = req.route?.path || req.path;

      this.metricsService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration,
        tenantId,
      );
    });

    next();
  }
}
