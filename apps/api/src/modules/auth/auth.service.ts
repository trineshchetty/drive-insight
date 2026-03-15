import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { User } from '@drive-insight/database';
import { SupabaseService } from './supabase.service';
import * as jwt from 'jsonwebtoken';
import { SupabaseAdminService } from './supabase-admin.service';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private supabaseAdminService: SupabaseAdminService,
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
      select: [
        'id',
        'tenant_id',
        'role',
        'email',
        'name',
        'account_status',
        'must_change_password',
        'invited_at',
        'activated_at',
        'disabled_at',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('User not found in database');
    }

    if (user.account_status === 'disabled') {
      throw new UnauthorizedException('Account disabled');
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
      account_status: user.account_status,
      must_change_password: user.must_change_password,
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
        account_status: user.account_status,
        must_change_password: user.must_change_password,
        invited_at: user.invited_at ?? null,
        activated_at: user.activated_at ?? null,
        disabled_at: user.disabled_at ?? null,
      },
      requires_password_change: user.must_change_password,
    };
  }

  async completePasswordChange(
    userId: string,
    newPassword: string,
    queryRunner: QueryRunner,
  ) {
    if (!queryRunner) {
      throw new Error('QueryRunner not available');
    }

    const user = await queryRunner.manager.findOne(User, { where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found in database');
    }

    if (user.account_status === 'disabled') {
      throw new UnauthorizedException('Account disabled');
    }

    if (!user.must_change_password) {
      throw new BadRequestException('Password change is not required');
    }

    await this.supabaseAdminService.updatePassword(user.id, newPassword);

    user.account_status = 'active';
    user.must_change_password = false;
    user.activated_at = new Date();
    user.disabled_at = null;

    const savedUser = await queryRunner.manager.save(user);

    return {
      message: 'Password updated successfully',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        tenant_id: savedUser.tenant_id,
        account_status: savedUser.account_status,
        must_change_password: savedUser.must_change_password,
        invited_at: savedUser.invited_at ?? null,
        activated_at: savedUser.activated_at ?? null,
        disabled_at: savedUser.disabled_at ?? null,
      },
    };
  }
}
