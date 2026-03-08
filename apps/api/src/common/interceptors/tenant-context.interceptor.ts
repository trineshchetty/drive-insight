import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { RequestContext } from '../context/request-context';

/**
 * TenantContextInterceptor - Sets up multi-tenant context for each request
 *
 * Responsibilities:
 * 1. Set PostgreSQL session variables for RLS (app.current_user_id, app.current_tenant_id, app.current_user_role)
 * 2. Set AsyncLocalStorage context for TypeORM subscribers (Story 1.3)
 * 3. Manage transaction lifecycle (start, commit, rollback, release)
 *
 * Execution order:
 * - SupabaseAuthGuard → sets request.user
 * - RolesGuard → checks user.role
 * - TenantContextInterceptor → sets PostgreSQL + AsyncLocalStorage context
 * - Request handler → executes with full context
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Populated by SupabaseAuthGuard

    // Skip if no user (public route or guard didn't populate)
    if (!user) {
      return next.handle();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // Set PostgreSQL session variables for RLS (Story 1.2)
      // Note: SET LOCAL doesn't support parameterized queries, using format() for safety
      await queryRunner.query(
        `SET LOCAL app.current_user_id = '${user.id.replace(/'/g, "''")}'`,
      );
      await queryRunner.query(
        `SET LOCAL app.current_tenant_id = '${user.tenant_id.replace(/'/g, "''")}'`,
      );
      await queryRunner.query(
        `SET LOCAL app.current_user_role = '${user.role.replace(/'/g, "''")}'`,
      );

      // Attach queryRunner to request for repository use
      request.queryRunner = queryRunner;

      // NEW in Story 1.3: Wrap request handler in AsyncLocalStorage context
      // This makes user context available to TypeORM subscribers for role-based filtering
      const result = await RequestContext.run(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          role: user.role,
          email: user.email,
        },
        async () => {
          try {
            // Convert Observable to Promise
            const observable = next.handle();
            const response = await lastValueFrom(observable);
            await queryRunner.commitTransaction();
            return response;
          } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
          } finally {
            await queryRunner.release();
          }
        },
      );

      // Return Observable from result
      return from(Promise.resolve(result));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }
}
