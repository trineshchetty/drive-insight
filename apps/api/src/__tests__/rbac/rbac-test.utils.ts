import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';

export type TestRole = 'owner' | 'manager' | 'agent';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: TestRole;
  tenantId: string;
  name: string;
  token: string;
}

export interface RbacTestContext {
  app: INestApplication;
  adminDataSource: DataSource;
  supabaseAdmin: SupabaseClient;
  tenantAId: string;
  tenantBId: string;
  cleanup: () => Promise<void>;
}

interface CreateTestUserInput {
  tenantId: string;
  role: TestRole;
  name: string;
  emailPrefix: string;
}

export async function createRbacTestContext(): Promise<RbacTestContext> {
  const originalLoggerEnv = {
    LOKI_HOST: process.env.LOKI_HOST,
    LOKI_USERNAME: process.env.LOKI_USERNAME,
    LOKI_PASSWORD: process.env.LOKI_PASSWORD,
  };

  process.env.LOKI_HOST = '';
  process.env.LOKI_USERNAME = '';
  process.env.LOKI_PASSWORD = '';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.init();

  const adminDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '54322'),
    username: 'postgres',
    password: 'postgres',
    database: process.env.DB_NAME || 'postgres',
  });
  await adminDataSource.initialize();

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set for RBAC tests');
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseServiceRoleKey,
  );

  const tenantAId = randomUUID();
  const tenantBId = randomUUID();

  await ensureTenant(adminDataSource, tenantAId, 'RBAC Tenant A', 'HQ');
  await ensureTenant(adminDataSource, tenantBId, 'RBAC Tenant B', 'Branch');

  return {
    app,
    adminDataSource,
    supabaseAdmin,
    tenantAId,
    tenantBId,
    cleanup: async () => {
      await adminDataSource.query(
        'DELETE FROM agent_profiles WHERE tenant_id IN ($1, $2)',
        [tenantAId, tenantBId],
      );
      await adminDataSource.query(
        'DELETE FROM users WHERE tenant_id IN ($1, $2)',
        [tenantAId, tenantBId],
      );
      await adminDataSource.query(
        'DELETE FROM tenants WHERE id IN ($1, $2)',
        [tenantAId, tenantBId],
      );
      await adminDataSource.destroy();
      await app.close();
      process.env.LOKI_HOST = originalLoggerEnv.LOKI_HOST;
      process.env.LOKI_USERNAME = originalLoggerEnv.LOKI_USERNAME;
      process.env.LOKI_PASSWORD = originalLoggerEnv.LOKI_PASSWORD;
    },
  };
}

export async function createAuthenticatedUser(
  ctx: RbacTestContext,
  input: CreateTestUserInput,
): Promise<TestUser> {
  const email = buildUniqueEmail(input.emailPrefix);
  const password = `Pass-${randomUUID()}`;

  const { data, error } = await ctx.supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error || new Error('Failed to create Supabase auth user');
  }

  try {
    await ctx.adminDataSource.query(
      `INSERT INTO users (id, tenant_id, email, role, name)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.user.id, input.tenantId, email, input.role, input.name],
    );
  } catch (dbError) {
    await ctx.supabaseAdmin.auth.admin.deleteUser(data.user.id);
    throw dbError;
  }

  const loginResponse = await request(ctx.app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email,
      password,
    })
    .expect(201);

  return {
    id: data.user.id,
    email,
    password,
    role: input.role,
    tenantId: input.tenantId,
    name: input.name,
    token: loginResponse.body.access_token,
  };
}

export async function deleteSupabaseUsers(
  ctx: RbacTestContext,
  users: Array<{ id: string }>,
): Promise<void> {
  for (const user of users) {
    await ctx.supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}

async function ensureTenant(
  adminDataSource: DataSource,
  id: string,
  name: string,
  branch: string,
) {
  await adminDataSource.query(
    `INSERT INTO tenants (id, name, branch, status)
     VALUES ($1, $2, $3, 'active')`,
    [id, name, branch],
  );
}

function buildUniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`;
}
