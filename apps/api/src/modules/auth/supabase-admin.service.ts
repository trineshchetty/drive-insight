import { Injectable } from '@nestjs/common';
import {
  SupabaseClient,
  User as SupabaseAuthUser,
  createClient,
} from '@supabase/supabase-js';

interface CreateSupabaseUserInput {
  email: string;
  password: string;
  name: string;
}

@Injectable()
export class SupabaseAdminService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly disabledBanDuration = '876000h';

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables',
      );
    }

    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async createUser(
    input: CreateSupabaseUserInput,
  ): Promise<SupabaseAuthUser> {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error('Supabase Auth user creation failed');
    }

    return data.user;
  }

  async getUserById(userId: string): Promise<SupabaseAuthUser | null> {
    const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(
      userId,
    );

    if (error) {
      if (error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }

    return data.user ?? null;
  }

  async findUserByEmail(email: string): Promise<SupabaseAuthUser | null> {
    let page = 1;

    while (true) {
      const { data, error } = await this.supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });

      if (error) {
        throw error;
      }

      const foundUser =
        data.users.find(
          (user) => user.email?.toLowerCase() === email.toLowerCase(),
        ) ?? null;

      if (foundUser) {
        return foundUser;
      }

      if (!data.nextPage || data.users.length === 0) {
        return null;
      }

      page = data.nextPage;
    }
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password,
      },
    );

    if (error) {
      throw error;
    }
  }

  async disableUser(userId: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        ban_duration: this.disabledBanDuration,
      },
    );

    if (error) {
      throw error;
    }
  }

  async enableUser(userId: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        ban_duration: 'none',
      },
    );

    if (error) {
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }
  }
}
