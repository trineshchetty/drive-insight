import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../../modules/logger';

/**
 * Middleware to extract tenant_id from requests and inject it into:
 * 1. Request object (for downstream use)
 * 2. Logger context (for structured logging)
 *
 * Tenant ID can come from:
 * - Authorization header (JWT token) - implemented in future auth story
 * - X-Tenant-ID header (for service-to-service calls)
 * - Query parameter (for testing/development)
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    let tenantId: string | undefined;

    // Priority 1: Extract from Authorization JWT (will be implemented in auth story)
    // const token = req.headers.authorization?.replace('Bearer ', '');
    // if (token) {
    //   const decoded = jwt.decode(token);
    //   tenantId = decoded?.tenant_id;
    // }

    // Priority 2: X-Tenant-ID header (for service-to-service, testing)
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'] as string;
    }

    // Priority 3: Query parameter (development/testing only)
    if (!tenantId && req.query.tenant_id) {
      tenantId = req.query.tenant_id as string;
    }

    // Store tenant_id in request object for downstream use
    if (tenantId) {
      (req as any).tenantId = tenantId;

      // Inject tenant_id into logger context
      this.logger.setTenantId(tenantId);
    }

    next();
  }
}
