# JWT Authentication Explained

> **Understanding JWT Signing for Multi-Tenant Authentication**
>
> This document explains how JWT (JSON Web Token) authentication works in the Drive Insight platform, using simple analogies and practical examples.

---

## Table of Contents

1. [The Cookie Jar Analogy](#the-cookie-jar-analogy)
2. [How JWT Signing Works](#how-jwt-signing-works)
3. [Two-Tier Authentication System](#two-tier-authentication-system)
4. [Technical Implementation](#technical-implementation)
5. [Security Considerations](#security-considerations)
6. [Quick Reference](#quick-reference)

---

## The Cookie Jar Analogy

### 🏠 Your House = Your App

**The Rule:** Only people with a special **sticker** can take cookies from the jar.

### 1️⃣ Getting Your Sticker (Login)

You walk up to Mom and say: "Hi Mom, I'm Timmy, and my password is 'dinosaur123'"

Mom checks:
- ✅ "Yes, you're Timmy"
- ✅ "Yes, 'dinosaur123' is correct"

Mom gives you a **sticker** that says:
```
👤 Name: Timmy
🏠 House: Blue House
🎂 Age: 5
⏰ Good Until: 3pm today
🔏 Mom's Secret Signature: ✨✨✨
```

**This sticker is your JWT (JSON Web Token)!**

### 2️⃣ Using Your Sticker (Making Requests)

Every time you want a cookie, you show your sticker.

The cookie jar has a **magic detector** that checks:
1. ✅ Does it have Mom's secret signature? (Only Mom knows how to make it!)
2. ✅ Is it still before 3pm?
3. ✅ Does it say you're from the Blue House?

If yes → You get a cookie! 🍪
If no → No cookie for you! 🚫

### 3️⃣ Why It's Secure

**Bad Kid Billy** tries to make his own sticker:
```
👤 Name: Billy
🏠 House: Blue House (lying!)
🎂 Age: 5
⏰ Good Until: 3pm today
🔏 Billy's Fake Signature: 🖍️🖍️🖍️
```

The cookie jar's magic detector says:
- ❌ "This signature is WRONG! Only Mom can make real signatures!"
- 🚫 "NO COOKIE FOR YOU, BILLY!"

**Why?** Billy doesn't know Mom's **secret signature recipe** (the JWT secret)!

---

## How JWT Signing Works

### In Your App - Login Flow

```typescript
// 1. User says: "I'm owner@dealershipa.com, password is 'password123'"
const { email, password } = loginRequest;

// 2. Supabase checks: "Yes, that's correct!"
const user = await supabase.auth.signInWithPassword({ email, password });

// 3. We make a sticker (JWT) with their info:
const sticker = {
  sub: user.id,
  email: "owner@dealershipa.com",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  role: "owner",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
};

// 4. We sign it with our SECRET (like Mom's signature)
const jwt = jwt.sign(sticker, process.env.SUPABASE_JWT_SECRET);

// 5. Give the sticker to the user
return { access_token: jwt };
```

### Using the JWT - Request Flow

```typescript
// User makes a request with their sticker:
Headers: {
  Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// SupabaseAuthGuard (the magic detector) checks:
const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);

if (payload.signature === "✨✨✨") {  // Mom's real signature!
  if (payload.exp > now) {  // Still valid?
    // ✅ LET THEM IN!
    request.user = {
      id: payload.sub,
      tenant_id: payload.tenant_id,
      role: payload.role,
      email: payload.email,
    };
  }
}
```

---

## Two-Tier Authentication System

### Why Two Secrets?

Drive Insight uses **two separate JWT secrets** for security isolation:

| **Aspect** | **SUPABASE_JWT_SECRET (Mom)** | **ADMIN_JWT_SECRET (Grandma)** |
|---|---|---|
| **Purpose** | Tenant-facing authentication | Platform admin authentication |
| **Used By** | Dealership staff (owners, managers, agents) | Your internal team |
| **Access Level** | Single tenant only (RLS enforced) | All tenants (cross-tenant) |
| **Endpoints** | `/api/users`, `/api/leads`, etc. | `/api/admin/*` |
| **Expiration** | 1 hour | 15-30 minutes (higher security) |
| **Implementation** | ✅ Story 1.2 (current) | ⏳ Story 7.1 (future) |

### SUPABASE_JWT_SECRET (Tenant Users)

**Example JWT Claims:**
```json
{
  "sub": "user-123-456",
  "email": "owner@dealershipa.com",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "role": "owner",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Access:**
- ✅ Can see/modify data for their own tenant only
- ❌ Cannot see other dealerships' data
- ❌ Cannot perform admin operations

**RLS Enforced:** PostgreSQL session variables set via `TenantContextInterceptor`

### ADMIN_JWT_SECRET (Platform Admins)

**Example JWT Claims:**
```json
{
  "sub": "admin-789",
  "email": "admin@yourcompany.com",
  "role": "platform_admin",
  "permissions": ["manage_tenants", "view_all_data"],
  "iat": 1234567890,
  "exp": 1234569690
}
```

**Access:**
- ✅ Can see/modify data across ALL tenants
- ✅ Can create new tenants
- ✅ Can suspend/reactivate tenants
- ✅ Can impersonate tenant users for support

**RLS Bypassed:** No `TenantContextInterceptor` applied

---

## Two Cookie Jars, Two Sets of Rules

### 🏠 Cookie Jar #1: Family Cookie Jar (Tenant)

**Location:** In the kitchen (regular endpoints)

**Guard:** `SupabaseAuthGuard`

**Checks stickers from:** Mom (`SUPABASE_JWT_SECRET`)

**Flow:**
```
Timmy → Shows Mom's sticker → Family Cookie Jar

1. SupabaseAuthGuard checks: "Is this Mom's signature?" ✅
2. Reads sticker: "Timmy from Blue House, role: owner"
3. TenantContextInterceptor: "SET tenant_id = Blue House"
4. Database: "ONLY return Blue House data"
5. Timmy gets: His Blue House toys only 🧸
```

**Rules Applied:**
```typescript
// SupabaseAuthGuard verifies:
const signature = jwt.verify(token, SUPABASE_JWT_SECRET);

// TenantContextInterceptor sets:
SET LOCAL app.current_tenant_id = 'Blue House';
SET LOCAL app.current_user_id = 'Timmy';
SET LOCAL app.current_user_role = 'owner';

// Result: RLS policies enforce tenant isolation
```

### 🏢 Cookie Jar #2: Master Cookie Jar (Admin)

**Location:** In the garage (admin endpoints)

**Guard:** `AdminAuthGuard` (Story 7.1 - future)

**Checks stickers from:** Grandma (`ADMIN_JWT_SECRET`)

**Flow:**
```
Uncle Dave → Shows Grandma's sticker → Master Cookie Jar

1. AdminAuthGuard checks: "Is this Grandma's signature?" ✅
2. Reads sticker: "Uncle Dave, role: platform_admin"
3. NO TenantContextInterceptor (admin bypass!)
4. Database: "Return EVERYTHING"
5. Uncle Dave gets: ALL toys from ALL houses 🎁🎁🎁
```

**Rules Applied:**
```typescript
// AdminAuthGuard verifies:
const signature = jwt.verify(token, ADMIN_JWT_SECRET);

// NO TenantContextInterceptor!
// NO RLS restrictions!

// Result: Full cross-tenant access
```

---

## Technical Implementation

### Current Implementation (Story 1.2)

#### 1. Tenant Login Endpoint

**File:** `apps/api/src/modules/auth/auth.controller.ts`

```typescript
@Controller('auth')
export class AuthController {
  @Public()  // Skip auth guard for login
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}
```

#### 2. Auth Service - JWT Generation

**File:** `apps/api/src/modules/auth/auth.service.ts`

```typescript
@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    // 1. Verify with Supabase Auth
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email, password });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Fetch user from database (get tenant_id, role)
    const user = await this.userRepo.findOne({ where: { email } });

    // 3. Sign custom JWT with tenant info
    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,  // Custom claim
      role: user.role,            // Custom claim
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);

    return { access_token: token, user };
  }
}
```

#### 3. Supabase Auth Guard - JWT Verification

**File:** `apps/api/src/common/guards/supabase-auth.guard.ts`

```typescript
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify JWT signature
      const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);

      // Populate request.user
      request.user = {
        id: payload.sub,
        tenant_id: payload.tenant_id,
        role: payload.role,
        email: payload.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

#### 4. Tenant Context Interceptor - RLS Enforcement

**File:** `apps/api/src/common/interceptors/tenant-context.interceptor.ts`

```typescript
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;  // Populated by SupabaseAuthGuard

    if (!user) return next.handle();  // Skip for public routes

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // Set PostgreSQL session variables for RLS
      await queryRunner.query('SET LOCAL app.current_user_id = $1', [user.id]);
      await queryRunner.query('SET LOCAL app.current_tenant_id = $1', [user.tenant_id]);
      await queryRunner.query('SET LOCAL app.current_user_role = $1', [user.role]);

      request.queryRunner = queryRunner;

      return next.handle().pipe(
        tap({
          next: async () => await queryRunner.commitTransaction(),
          error: async () => await queryRunner.rollbackTransaction(),
          finalize: async () => await queryRunner.release(),
        }),
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }
}
```

#### 5. Global Configuration

**File:** `apps/api/src/app.module.ts`

```typescript
@Module({
  providers: [
    // Global auth guard - applies to ALL routes except @Public()
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Global tenant context - sets session variables for RLS
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule {}
```

### Future Implementation (Story 7.1)

#### Admin Login Endpoint

```typescript
@Controller('admin/auth')
export class AdminAuthController {
  @Public()
  @Post('login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    // Signs JWT with ADMIN_JWT_SECRET
    const jwt = sign(adminInfo, process.env.ADMIN_JWT_SECRET);
    return { access_token: jwt };
  }
}
```

#### Admin Endpoints

```typescript
@Controller('admin/users')
@UseGuards(AdminAuthGuard)  // Uses ADMIN_JWT_SECRET
export class AdminUsersController {
  @Get()
  async getAllUsers(@Request() req) {
    // NO TenantContextInterceptor!
    // Returns ALL users from ALL dealerships
    return this.usersService.findAll();
  }
}
```

---

## Security Considerations

### What Happens If Someone Tries to Cheat?

#### Scenario 1: User Modifies Their JWT

**Original JWT:**
```json
{
  "sub": "user-123",
  "tenant_id": "tenant-A",
  "role": "agent"
}
Signature: ✨✨✨ (valid)
```

**User tries to change it:**
```json
{
  "sub": "user-123",
  "tenant_id": "tenant-A",
  "role": "owner"  ← CHANGED!
}
Signature: ✨✨✨ (now invalid!)
```

**Result:**
- ❌ Signature verification fails
- ❌ `jwt.verify()` throws error
- 🚫 401 Unauthorized returned

**Why?** The signature is computed from the **entire payload**. Changing any part of the payload invalidates the signature.

#### Scenario 2: User Creates Fake JWT

**Fake JWT:**
```json
{
  "sub": "hacker-999",
  "tenant_id": "tenant-A",
  "role": "owner"
}
Signature: 🖍️🖍️🖍️ (fake signature using guessed secret)
```

**Result:**
- ❌ Signature doesn't match `SUPABASE_JWT_SECRET`
- ❌ `jwt.verify()` throws error
- 🚫 401 Unauthorized returned

**Why?** Only the server knows the `SUPABASE_JWT_SECRET`. Without it, you cannot create a valid signature.

#### Scenario 3: Tenant User Tries Admin Endpoint

**Timmy (tenant user) tries:**
```
GET /api/admin/users
Authorization: Bearer <tenant-jwt-signed-with-SUPABASE_JWT_SECRET>
```

**Result:**
```typescript
// AdminAuthGuard checks:
jwt.verify(token, process.env.ADMIN_JWT_SECRET);  // ← Wrong secret!

// Throws error:
throw new UnauthorizedException('Invalid token');
```

**Why?** The JWT was signed with `SUPABASE_JWT_SECRET`, but the admin guard expects `ADMIN_JWT_SECRET`.

#### Scenario 4: Admin Tries Tenant Endpoint

**Uncle Dave (admin) tries:**
```
GET /api/users
Authorization: Bearer <admin-jwt-signed-with-ADMIN_JWT_SECRET>
```

**Result:**
```typescript
// SupabaseAuthGuard checks:
jwt.verify(token, process.env.SUPABASE_JWT_SECRET);  // ← Wrong secret!

// Throws error:
throw new UnauthorizedException('Invalid token');
```

**Why?** The JWT was signed with `ADMIN_JWT_SECRET`, but the tenant guard expects `SUPABASE_JWT_SECRET`.

*(Note: We could configure it to allow admin JWTs, but admins should use admin endpoints for admin operations)*

---

## The Three Parts of a JWT

A JWT has three parts separated by dots (`.`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVKJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Part 1: Header (Algorithm & Type)

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Encoded:** `eyJhbGciOiJIUzI1NiINInR5cCI6IkpXVCJ9`

**Says:** "I'm a JWT, signed with HMAC SHA256"

### Part 2: Payload (Claims/Data)

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}
```

**Encoded:** `eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZOI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ`

**Says:** "This is who I am and what I can do"

### Part 3: Signature (Verification)

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  SUPABASE_JWT_SECRET
)
```

**Encoded:** `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`

**Says:** "This proves Mom signed it - nobody else knows the secret!"

---

## Quick Reference

### Environment Variables

```bash
# Tenant authentication (Story 1.2 - current)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
SUPABASE_JWT_SECRET=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# Admin authentication (Story 7.1 - future)
ADMIN_JWT_SECRET=<generate-with-openssl-rand-base64-32>
```

### Getting SUPABASE_JWT_SECRET

```bash
# Start Supabase
npx supabase start

# View status (look for "Secret" under Authentication Keys)
npx supabase status
```

**Output:**
```
╭──────────────────────────────────────────────────────────────╮
│ 🔑 Authentication Keys                                       │
├─────────────┬────────────────────────────────────────────────┤
│ Secret      │ sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz      │  ← This one!
╰─────────────┴────────────────────────────────────────────────╯
```

### Testing Authentication

```bash
# 1. Create test user in Supabase Studio
# http://127.0.0.1:54323 → Authentication → Add User

# 2. Login via API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@dealershipa.com","password":"password123"}'

# 3. Use returned JWT in requests
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Key Files

| **File** | **Purpose** |
|---|---|
| `apps/api/src/modules/auth/auth.service.ts` | Signs JWTs with custom claims |
| `apps/api/src/common/guards/supabase-auth.guard.ts` | Verifies JWTs and populates `request.user` |
| `apps/api/src/common/interceptors/tenant-context.interceptor.ts` | Sets PostgreSQL session variables for RLS |
| `apps/api/src/common/decorators/public.decorator.ts` | Marks endpoints as public (no auth) |
| `apps/api/src/app.module.ts` | Registers global guard and interceptor |

---

## Summary

**JWT Signing = Mom's Secret Signature on Your Sticker**

1. **Login** → Server gives you a signed JWT (sticker)
2. **Request** → You send JWT in `Authorization` header (show sticker)
3. **Guard** → Server verifies signature using secret (check Mom's signature)
4. **Interceptor** → Server sets RLS variables (apply tenant rules)
5. **Success** → You get what you asked for (get cookie)!

**The secret (`SUPABASE_JWT_SECRET`)** is like Mom's secret recipe - only the server knows it, so nobody can make fake JWTs!

**Two secrets = Two cookie jars:**
- `SUPABASE_JWT_SECRET` → Tenant users → Limited access
- `ADMIN_JWT_SECRET` → Platform admins → Full access

**Segregation happens at the endpoint level, not the JWT level!**

---

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io - Debugger](https://jwt.io/)
- [Story 1.2 Implementation](../_bmad-output/implementation-artifacts/1-2-tenant-user-authentication-login-session.md)

---

*Last Updated: 2026-03-01*
*Story: 1.2 - Tenant User Authentication (Login / Session)*
