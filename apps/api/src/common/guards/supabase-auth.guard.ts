import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

      // Attach user context
      request.user = {
        id: payload.sub,
        tenant_id: payload.tenant_id, // Custom claim
        role: payload.role, // Custom claim
        email: payload.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
