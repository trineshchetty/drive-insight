import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Authentication Integration Tests (e2e)', () => {
  let app: INestApplication;
  let adminDataSource: DataSource; // For test setup (bypasses RLS)
  let supabaseAdmin: SupabaseClient;

  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const TEST_USER_EMAIL = 'owner@dealershipa.com';
  const TEST_USER_PASSWORD = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();

    // Create admin DataSource for test setup (uses postgres user, bypasses RLS)
    // This is necessary because app_user enforces RLS and can't insert test data
    // The app's normal DataSource uses app_user (RLS enforced)
    adminDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '54322'),
      username: 'postgres', // Use postgres for test setup only
      password: 'postgres',
      database: process.env.DB_NAME || 'postgres',
    });
    await adminDataSource.initialize();

    // Initialize Supabase admin client
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
  });

  afterAll(async () => {
    await adminDataSource.destroy();
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create test user in Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.error('Failed to create test user:', error);
        throw error;
      }

      testUserId = data.user.id;

      // Insert user into database (using adminDataSource to bypass RLS)
      await adminDataSource.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [testUserId, TENANT_A_ID, TEST_USER_EMAIL, 'owner', 'Test Owner A'],
      );
    });

    afterAll(async () => {
      // Clean up test user (using adminDataSource to bypass RLS)
      await adminDataSource.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    });

    it('AC1: Should login with valid credentials and return JWT with custom claims', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: testUserId,
        email: TEST_USER_EMAIL,
        name: 'Test Owner A',
        role: 'owner',
        tenant_id: TENANT_A_ID,
      });

      // Verify JWT contains custom claims
      const token = response.body.access_token;
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );

      expect(payload).toMatchObject({
        sub: testUserId,
        email: TEST_USER_EMAIL,
        tenant_id: TENANT_A_ID,
        role: 'owner',
      });

      // Verify JWT expiration is 1 hour (3600 seconds)
      expect(payload.exp - payload.iat).toBe(3600);
    });

    it('AC2: Should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Invalid credentials',
      });
    });

    it('Should validate DTO and return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          // Missing password
        })
        .expect(400);
    });

    it('Should validate DTO and return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('First-Login Password Change Lifecycle', () => {
    let invitedUserId: string;
    let invitedEmail: string;
    const temporaryPassword = 'TempPassword123!';
    const newPassword = 'UpdatedPassword123!';

    beforeAll(async () => {
      invitedEmail = `invited-${randomUUID()}@example.com`;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: invitedEmail,
        password: temporaryPassword,
        email_confirm: true,
      });

      if (error || !data.user) {
        throw error || new Error('Failed to create invited auth user');
      }

      invitedUserId = data.user.id;

      await adminDataSource.query(
        `INSERT INTO users (
           id,
           tenant_id,
           email,
           role,
           name,
           account_status,
           must_change_password,
           invited_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          invitedUserId,
          TENANT_A_ID,
          invitedEmail,
          'agent',
          'Invited Agent',
          'invited',
          true,
        ],
      );
    });

    afterAll(async () => {
      await adminDataSource.query('DELETE FROM users WHERE id = $1', [invitedUserId]);
      await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
    });

    it('returns lifecycle flags on login and blocks protected routes until the password is changed', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: invitedEmail,
          password: temporaryPassword,
        })
        .expect(201);

      expect(loginResponse.body).toMatchObject({
        requires_password_change: true,
        user: {
          id: invitedUserId,
          account_status: 'invited',
          must_change_password: true,
        },
      });

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .expect(403);
    });

    it('completes the password change, activates the user, and invalidates the temporary password', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: invitedEmail,
          password: temporaryPassword,
        })
        .expect(201);

      const completeResponse = await request(app.getHttpServer())
        .post('/api/auth/complete-password-change')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .send({
          newPassword,
        })
        .expect(201);

      expect(completeResponse.body).toMatchObject({
        message: 'Password updated successfully',
        user: {
          id: invitedUserId,
          account_status: 'active',
          must_change_password: false,
        },
      });

      const rows = await adminDataSource.query(
        `SELECT account_status, must_change_password, activated_at
         FROM users
         WHERE id = $1`,
        [invitedUserId],
      );

      expect(rows[0].account_status).toBe('active');
      expect(rows[0].must_change_password).toBe(false);
      expect(rows[0].activated_at).not.toBeNull();

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: invitedEmail,
          password: temporaryPassword,
        })
        .expect(401);

      const reloginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: invitedEmail,
          password: newPassword,
        })
        .expect(201);

      expect(reloginResponse.body).toMatchObject({
        requires_password_change: false,
        user: {
          id: invitedUserId,
          account_status: 'active',
          must_change_password: false,
        },
      });
    });
  });

  describe('Disabled User Lifecycle', () => {
    let disabledUserId: string;
    let disabledEmail: string;
    const disabledPassword = 'DisabledPassword123!';

    beforeAll(async () => {
      disabledEmail = `disabled-${randomUUID()}@example.com`;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: disabledEmail,
        password: disabledPassword,
        email_confirm: true,
      });

      if (error || !data.user) {
        throw error || new Error('Failed to create disabled auth user');
      }

      disabledUserId = data.user.id;

      await adminDataSource.query(
        `INSERT INTO users (
           id,
           tenant_id,
           email,
           role,
           name,
           account_status,
           must_change_password,
           disabled_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          disabledUserId,
          TENANT_A_ID,
          disabledEmail,
          'agent',
          'Disabled Agent',
          'disabled',
          false,
        ],
      );
    });

    afterAll(async () => {
      await adminDataSource.query('DELETE FROM users WHERE id = $1', [disabledUserId]);
      await supabaseAdmin.auth.admin.deleteUser(disabledUserId);
    });

    it('refuses login for disabled users even when Supabase credentials are valid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: disabledEmail,
          password: disabledPassword,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        message: 'Account disabled',
      });
    });
  });

  describe('Protected Endpoints - Auth Guard', () => {
    let validToken: string;
    let testUserId: string;

    beforeAll(async () => {
      // Create test user
      const { data } = await supabaseAdmin.auth.admin.createUser({
        email: 'manager@dealershipa.com',
        password: 'password123',
        email_confirm: true,
      });

      if (!data.user) {
        throw new Error('Failed to create test user: user data is null');
      }

      testUserId = data.user.id;

      // Insert user using adminDataSource (bypasses RLS for test setup)
      await adminDataSource.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [testUserId, TENANT_A_ID, 'manager@dealershipa.com', 'manager', 'Test Manager A'],
      );

      // Get valid token
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'manager@dealershipa.com',
          password: 'password123',
        });

      validToken = response.body.access_token;
    });

    afterAll(async () => {
      // Clean up using adminDataSource (bypasses RLS)
      await adminDataSource.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    });

    it('AC3: Should access protected endpoint with valid JWT and populate request.user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/whoami')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify request.user was populated by SupabaseAuthGuard
      expect(response.body.user).toMatchObject({
        id: testUserId,
        email: 'manager@dealershipa.com',
        tenant_id: TENANT_A_ID,
        role: 'manager',
      });
    });

    it('Should return 401 for missing token on protected endpoint', async () => {
      await request(app.getHttpServer())
        .get('/api/users/whoami')
        .expect(401);
    });

    it('Should return 401 for invalid token on protected endpoint', async () => {
      await request(app.getHttpServer())
        .get('/api/users/whoami')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('Should return 401 for expired token on protected endpoint', async () => {
      // Create a token that's already expired
      const expiredPayload = {
        sub: testUserId,
        email: 'manager@dealershipa.com',
        tenant_id: TENANT_A_ID,
        role: 'manager',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        expiredPayload,
        process.env.SUPABASE_JWT_SECRET,
        { algorithm: 'HS256' }
      );

      await request(app.getHttpServer())
        .get('/api/users/whoami')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Public Endpoints', () => {
    it('Should access health endpoint without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
    });

    it('Should access metrics endpoint without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200);
    });

    it('Should access login endpoint without auth', async () => {
      // Expect 400 for invalid data, not 401 for missing auth
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('AC4: RLS Enforcement - Tenant Isolation via API', () => {
    const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';
    let tenantAUserId: string;
    let tenantBUserId: string;
    let tenantAToken: string;
    let tenantBToken: string;

    beforeAll(async () => {
      // Create Tenant B in database (using adminDataSource to bypass RLS)
      await adminDataSource.query(
        `INSERT INTO tenants (id, name, branch, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [TENANT_B_ID, 'Dealership B', 'Downtown', 'active']
      );

      // Create user in Tenant A
      const { data: userAData } = await supabaseAdmin.auth.admin.createUser({
        email: 'owner@dealershipa.com',
        password: 'password123',
        email_confirm: true,
      });

      if (!userAData.user) {
        throw new Error('Failed to create Tenant A user');
      }

      tenantAUserId = userAData.user.id;

      // Insert user using adminDataSource (bypasses RLS for test setup)
      await adminDataSource.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [tenantAUserId, TENANT_A_ID, 'owner@dealershipa.com', 'owner', 'Owner A']
      );

      // Create user in Tenant B
      const { data: userBData } = await supabaseAdmin.auth.admin.createUser({
        email: 'owner@dealershipb.com',
        password: 'password123',
        email_confirm: true,
      });

      if (!userBData.user) {
        throw new Error('Failed to create Tenant B user');
      }

      tenantBUserId = userBData.user.id;

      // Insert user using adminDataSource (bypasses RLS for test setup)
      await adminDataSource.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [tenantBUserId, TENANT_B_ID, 'owner@dealershipb.com', 'owner', 'Owner B']
      );

      // Login as Tenant A user
      const responseA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'owner@dealershipa.com',
          password: 'password123',
        });

      tenantAToken = responseA.body.access_token;

      // Login as Tenant B user
      const responseB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'owner@dealershipb.com',
          password: 'password123',
        });

      tenantBToken = responseB.body.access_token;
    });

    afterAll(async () => {
      // Clean up using adminDataSource (bypasses RLS)
      await adminDataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [tenantAUserId, tenantBUserId]);
      await adminDataSource.query('DELETE FROM tenants WHERE id = $1', [TENANT_B_ID]);
      await supabaseAdmin.auth.admin.deleteUser(tenantAUserId);
      await supabaseAdmin.auth.admin.deleteUser(tenantBUserId);
    });

    it('AC4: Tenant A user should only see Tenant A users (RLS enforced)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .expect(200);

      const users = response.body;

      // Should only return Tenant A users
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      // Verify all returned users belong to Tenant A
      users.forEach((user: any) => {
        expect(user.tenant_id).toBe(TENANT_A_ID);
      });

      // Verify Tenant A user is in the list
      const tenantAUser = users.find((u: any) => u.id === tenantAUserId);
      expect(tenantAUser).toBeDefined();
      expect(tenantAUser.email).toBe('owner@dealershipa.com');

      // Verify Tenant B user is NOT in the list
      const tenantBUser = users.find((u: any) => u.id === tenantBUserId);
      expect(tenantBUser).toBeUndefined();
    });

    it('AC4: Tenant B user should only see Tenant B users (RLS enforced)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tenantBToken}`)
        .expect(200);

      const users = response.body;

      // Should only return Tenant B users
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      // Verify all returned users belong to Tenant B
      users.forEach((user: any) => {
        expect(user.tenant_id).toBe(TENANT_B_ID);
      });

      // Verify Tenant B user is in the list
      const tenantBUser = users.find((u: any) => u.id === tenantBUserId);
      expect(tenantBUser).toBeDefined();
      expect(tenantBUser.email).toBe('owner@dealershipb.com');

      // Verify Tenant A user is NOT in the list
      const tenantAUser = users.find((u: any) => u.id === tenantAUserId);
      expect(tenantAUser).toBeUndefined();
    });

    it('AC4: Verify TenantContextInterceptor sets session variables correctly', async () => {
      // This test verifies that the interceptor properly sets PostgreSQL session variables
      // by checking that RLS policies are actually applied (which depend on those variables)

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .expect(200);

      const users = response.body;

      // If RLS is working, we should ONLY see Tenant A users
      // This proves:
      // 1. SupabaseAuthGuard populated request.user
      // 2. TenantContextInterceptor set app.current_tenant_id
      // 3. RLS policies are enforced based on session variables
      expect(users.every((u: any) => u.tenant_id === TENANT_A_ID)).toBe(true);
    });
  });
});
