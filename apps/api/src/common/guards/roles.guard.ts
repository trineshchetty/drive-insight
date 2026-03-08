import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * RolesGuard - Enforces role-based access control
 *
 * Execution order: SupabaseAuthGuard (sets request.user) → RolesGuard (checks role)
 *
 * @example
 * // In controller:
 * @Roles('owner', 'manager')
 * @Post('/users')
 * async createUser() { ... }
 *
 * // Guard behavior:
 * - @Public() decorator → Skip role check
 * - No @Roles() decorator → Allow all authenticated users
 * - User role matches one of required roles → Allow
 * - User role does not match → Throw ForbiddenException (403)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip role check for @Public() routes
    }

    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    // If no roles required, allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by SupabaseAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has one of the required roles
    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Insufficient permissions: requires one of [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
