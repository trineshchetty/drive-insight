import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { RequestContext } from '../context/request-context';

/**
 * TenantContextInterceptor - Sets up multi-tenant context for each request
 *
 * Responsibilities:
 * 1. Set PostgreSQL session variables for RLS (app.current_user_id, app.current_tenant_id, app.current_user_role)
 * 2. Set AsyncLocalStorage context for downstream data-access layers (Story 1.3)
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Populated by SupabaseAuthGuard

    // Skip if no user (public route or guard didn't populate)
    if (!user) {
      return next.handle();
    }

    this.validateUserContext(user);

    return from(this.runWithContext(request, user, next));
  }

  private async runWithContext(
    request: any,
    user: { id: string; tenant_id: string; role: string; email?: string },
    next: CallHandler,
  ): Promise<any> {
    request.postCommitActions = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await queryRunner.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [user.id],
      );
      await queryRunner.query(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        [user.tenant_id],
      );
      await queryRunner.query(
        `SELECT set_config('app.current_user_role', $1, true)`,
        [user.role],
      );

      // Attach queryRunner to request for repository use
      request.queryRunner = queryRunner;

      return await RequestContext.run(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          role: user.role,
          email: user.email ?? '',
        },
        async () => {
          try {
            const response = await lastValueFrom(next.handle());
            await queryRunner.commitTransaction();

            if (Array.isArray(request.postCommitActions)) {
              for (const action of request.postCommitActions) {
                try {
                  await action();
                } catch (postCommitError) {
                  // Post-commit actions (e.g. email dispatch) must not fail the
                  // already-committed response.  Log and continue so the client
                  // receives the success result rather than a misleading 500.
                  console.error(
                    'Post-commit action failed after transaction committed:',
                    postCommitError,
                  );
                }
              }
            }

            return response;
          } catch (error) {
            if (queryRunner.isTransactionActive) {
              await queryRunner.rollbackTransaction();
            }
            throw error;
          } finally {
            if (!queryRunner.isReleased) {
              await queryRunner.release();
            }
          }
        },
      );
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
      throw error;
    }
  }

  private validateUserContext(user: any): asserts user is {
    id: string;
    tenant_id: string;
    role: string;
    email?: string;
  } {
    if (
      !this.isNonEmptyString(user?.id) ||
      !this.isNonEmptyString(user?.tenant_id) ||
      !this.isNonEmptyString(user?.role)
    ) {
      throw new UnauthorizedException('Invalid authenticated user context');
    }
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
