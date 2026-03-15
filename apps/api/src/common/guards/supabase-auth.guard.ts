import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User } from '@drive-insight/database';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip auth for @Public() routes
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET not configured');
    }

    try {
      // Verify Supabase JWT
      const payload = jwt.verify(token, jwtSecret) as any;

      if (
        !this.isNonEmptyString(payload?.sub) ||
        !this.isNonEmptyString(payload?.tenant_id) ||
        !this.isNonEmptyString(payload?.role) ||
        !this.isNonEmptyString(payload?.email)
      ) {
        throw new UnauthorizedException('Invalid token claims');
      }

      const currentUser = await this.dataSource.getRepository(User).findOne({
        where: { id: payload.sub },
        select: [
          'id',
          'tenant_id',
          'role',
          'email',
          'account_status',
          'must_change_password',
        ],
      });

      if (!currentUser) {
        throw new UnauthorizedException('User not found');
      }

      if (currentUser.account_status === 'disabled') {
        throw new UnauthorizedException('Account disabled');
      }

      const requestPath = request.originalUrl ?? request.url ?? '';
      const isPasswordChangeEndpoint =
        request.method === 'POST' &&
        requestPath.endsWith('/api/auth/complete-password-change');

      if (currentUser.must_change_password && !isPasswordChangeEndpoint) {
        throw new ForbiddenException(
          'Password change required before accessing other resources',
        );
      }

      // Attach user context
      request.user = {
        id: currentUser.id,
        tenant_id: currentUser.tenant_id,
        role: currentUser.role,
        email: currentUser.email,
        account_status: currentUser.account_status,
        must_change_password: currentUser.must_change_password,
      };

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
