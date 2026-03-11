import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@drive-insight/database';
import { SupabaseService } from './supabase.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async login(email: string, password: string) {
    // 1. Verify credentials with Supabase Auth
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Fetch user record from database to get tenant_id and role
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'tenant_id', 'role', 'email', 'name'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found in database');
    }

    // 3. Generate custom JWT with tenant_id, role, user_id
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET not configured');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: 'HS256',
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  }
}
