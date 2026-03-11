import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request context data stored in AsyncLocalStorage
 * Accessible from anywhere in the request lifecycle, including TypeORM subscribers
 */
export interface RequestContextData {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

/**
 * RequestContext - Provides request-scoped data access using AsyncLocalStorage
 *
 * Why AsyncLocalStorage?
 * - TypeORM subscribers run outside NestJS request context
 * - Allows access to user data in TypeORM query filters
 * - Persists across async operations within the request
 *
 * Usage:
 * - Set in TenantContextInterceptor (wraps request handler)
 * - Read in TypeORM subscribers for role-based query filtering
 * - Read in services for user-specific logic
 *
 * @example
 * // In TenantContextInterceptor:
 * return await RequestContext.run(
 *   { userId, tenantId, role, email },
 *   async () => next.handle().toPromise()
 * );
 *
 * // In TypeORM subscriber:
 * const role = RequestContext.getCurrentRole();
 * const userId = RequestContext.getCurrentUserId();
 */
export class RequestContext {
  private static storage = new AsyncLocalStorage<RequestContextData>();

  /**
   * Run callback with request context
   * Used by TenantContextInterceptor to wrap request handler
   */
  static run<T>(data: RequestContextData, callback: () => Promise<T>): Promise<T> {
    return this.storage.run(data, callback);
  }

  /**
   * Get current user ID from request context
   * Returns undefined if called outside request context
   */
  static getCurrentUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  /**
   * Get current tenant ID from request context
   * Returns undefined if called outside request context
   */
  static getCurrentTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  /**
   * Get current user role from request context
   * Returns undefined if called outside request context
   */
  static getCurrentRole(): string | undefined {
    return this.storage.getStore()?.role;
  }

  /**
   * Get current user email from request context
   * Returns undefined if called outside request context
   */
  static getEmail(): string | undefined {
    return this.storage.getStore()?.email;
  }

  /**
   * Get all context data
   * Returns undefined if called outside request context
   */
  static getAll(): RequestContextData | undefined {
    return this.storage.getStore();
  }
}
