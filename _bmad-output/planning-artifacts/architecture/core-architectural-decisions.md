# Core Architectural Decisions

## Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Agentic workflow layer (LangGraph)
- Authentication & authorization (Supabase JWT + RLS + Guards)
- Data layer (TypeORM + PostgreSQL RLS)
- Type safety (Zod + TypeORM entities + shared types)
- Multi-tenancy enforcement (Defense-in-depth)
- Monitoring (Grafana Cloud)

**Important Decisions (Shape Architecture):**
- API design patterns (RESTful + Actions)
- CI/CD pipeline (GitHub Actions)
- Testing strategy (Jest + Playwright + Supabase local)
- Admin application (Separate superuser app)
- Email & storage (Supabase Auth + Storage, Resend for transactional)

**Deferred Decisions (Post-MVP):**
- Advanced alerting (PagerDuty integration)
- Distributed tracing (Tempo)
- Staging environment
- Horizontal scaling strategy

---

## Category 1: Agentic Workflow Layer

**Decision:** LangGraph (Embedded in NestJS)

**Rationale:**
- Learning goal: Understand stateful multi-agent workflows
- Production capability: Battle-tested framework for complex agent orchestration
- Flexibility: Supports graph-based state machines for conversation flows
- Integration: Runs in same Node.js process as NestJS (simpler for MVP)

**Implementation:**
```typescript
// apps/api/src/modules/langraph/langraph.service.ts
import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class LangGraphService {
  private graph: StateGraph;

  constructor() {
    this.graph = this.buildConversationGraph();
  }

  private buildConversationGraph() {
    const graph = new StateGraph({
      channels: {
        messages: { value: null },
        intent: { value: null },
        temperature: { value: null },
      }
    });

    // Define agent nodes and edges
    graph.addNode('classifier', this.classifyIntent);
    graph.addNode('qualifier', this.qualifyLead);
    graph.addNode('booking_agent', this.handleBooking);

    graph.setEntryPoint('classifier');
    // ... edges and conditional routing

    return graph.compile();
  }

  async processConversation(messages: Message[], tenantId: string) {
    const result = await this.graph.invoke({ messages });

    // Track cost
    llmCostTotal.inc({
      tenant_id: tenantId,
      model: 'gpt-4',
      operation: 'completion',
    }, result.cost);

    return result;
  }
}
```

**Version:** Latest stable (to be determined during implementation)

**Affects:** AI agent processing, conversation workflows, cost tracking

**Migration Path:** Can extract to separate microservice if performance requires

---

## Category 2: Authentication & Authorization

**Decision 2.1:** Supabase JWT Verification in NestJS Guards

**Implementation:**
```typescript
// apps/api/src/common/guards/supabase-auth.guard.ts
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify Supabase JWT
      const payload = jwt.verify(token, SUPABASE_JWT_SECRET);

      // Attach user context
      request.user = {
        id: payload.sub,
        tenant_id: payload.tenant_id, // Custom claim
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

**Decision 2.2:** Defense-in-Depth Multi-Tenancy (RLS + Middleware + Guards)

**Three Security Layers:**

1. **PostgreSQL RLS Policies** (Database Level)
```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY role_based_access ON conversations
  USING (
    current_setting('app.current_user_role', true) = 'owner'
    OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );
```

2. **NestJS Tenant Context Interceptor** (Application Level)
```typescript
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // Set PostgreSQL session variables for RLS
      await queryRunner.query('SET LOCAL app.current_user_id = $1', [user.id]);
      await queryRunner.query('SET LOCAL app.current_tenant_id = $1', [user.tenant_id]);
      await queryRunner.query('SET LOCAL app.current_user_role = $1', [user.role]);

      request.queryRunner = queryRunner;

      const result = await next.handle().toPromise();
      await queryRunner.commitTransaction();

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

3. **TypeORM Global Query Filters** (ORM Level)
```typescript
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  beforeQuery(event: LoadEvent<any>) {
    const tenantId = getCurrentTenantId(); // From request context
    if (tenantId && event.metadata.hasColumn('tenant_id')) {
      event.query.andWhere('tenant_id = :tenantId', { tenantId });
    }
  }
}
```

**Decision 2.3:** Encrypted Tenant API Keys (Supabase pgcrypto)

```typescript
@Entity('tenant_integrations')
export class TenantIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  integration_type: string; // 'manychat', 'meta_lead_ads', 'twilio'

  @Column({ type: 'jsonb' })
  encrypted_credentials: any; // Encrypted via pgcrypto

  @CreateDateColumn()
  created_at: Date;
}

// Encrypt on save
async saveIntegration(data: CreateIntegrationDto) {
  const encrypted = await this.encrypt(data.credentials);
  return this.integrationRepo.save({ ...data, encrypted_credentials: encrypted });
}

// Decrypt on read
async getCredentials(tenantId: string, type: string) {
  const integration = await this.integrationRepo.findOne({
    where: { tenant_id: tenantId, integration_type: type }
  });
  return this.decrypt(integration.encrypted_credentials);
}
```

**Decision 2.4:** RBAC via NestJS Guards + RLS Policies

```typescript
// Role guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.includes(user.role);
  }
}

// Usage
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('owner', 'manager')
@Post('/users')
async createUser(@Body() data: CreateUserDto) {
  return this.usersService.create(data);
}
```

**Connection Pooling:**
```typescript
// TypeORM DataSource configuration
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    max: 25,              // Maximum connections in pool
    min: 5,               // Minimum connections always open
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
}
```

**Affects:** All data access, security compliance, audit requirements

---

## Category 3: API Design & Communication Patterns

**Decision 3.1:** RESTful + Action-Based Endpoints

**Resource-Based:**
```
GET    /api/conversations
GET    /api/conversations/:id
POST   /api/conversations
PATCH  /api/conversations/:id
```

**Action-Based (Domain Operations):**
```
POST   /api/conversations/:id/complete
POST   /api/conversations/:id/assign-agent
POST   /api/leads/:id/assign
POST   /api/leads/:id/qualify
POST   /api/bookings/:id/confirm
POST   /api/bookings/:id/mark-no-show
POST   /api/bookings/:id/reschedule
```

**Rationale:** Action endpoints better model stateful business operations (booking lifecycle, lead stages, conversation states)

**Decision 3.2:** No API Versioning for MVP

**Rationale:** Internal Next.js dashboard updates in lockstep with API. Add versioning when external API consumers exist.

**Decision 3.3:** Standard HTTP Status Codes + JSON Errors

```typescript
// Error response format
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "temperature", "message": "Must be HOT, WARM, COOL, or COLD" }
  ],
  "timestamp": "2026-02-08T14:32:00Z",
  "path": "/api/leads"
}

// NestJS exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

**Decision 3.4:** NestJS Throttler Module (Global Rate Limiting)

```typescript
// Global rate limiting
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 60 seconds
      limit: 100,  // 100 requests per minute
    }]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})

// Higher limits for webhook endpoints
@Throttle({ default: { ttl: 60000, limit: 500 } })
@Post('/webhooks/manychat/:tenantId')
async handleManyChat(@Param('tenantId') tenantId: string, @Body() payload: any) {
  return this.webhookService.processManyChat(tenantId, payload);
}
```

**Decision 3.5:** Swagger/OpenAPI Auto-Generated Documentation

```typescript
// NestJS decorators generate Swagger docs
@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  @ApiOperation({ summary: 'Get all conversations for tenant' })
  @ApiResponse({ status: 200, type: [ConversationDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async findAll(@Request() req): Promise<ConversationDto[]> {
    return this.conversationsService.findAll(req.user.tenant_id);
  }

  @ApiOperation({ summary: 'Complete a conversation' })
  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/complete')
  async complete(@Param('id') id: string) {
    return this.conversationsService.complete(id);
  }
}

// Swagger available at /api/docs
```

**Affects:** Frontend development, API documentation, external integrations

---

## Category 4: Data Validation & Type Safety

**Decision 4.1:** Zod for Validation (Shared Frontend + Backend)

```typescript
// packages/types/src/schemas/lead.schema.ts
import { z } from 'zod';

export const CreateLeadSchema = z.object({
  tenant_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  temperature: z.enum(['HOT', 'WARM', 'COOL', 'COLD']),
  stage: z.enum(['new', 'qualified', 'booking_created', 'in_follow_up', 'won', 'lost']),
  source_channel: z.enum(['whatsapp', 'messenger', 'sms', 'meta_lead_ads']),
});

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;

// NestJS usage
@Post()
async create(@Body() data: CreateLeadDto) {
  // Validate with Zod
  const validated = CreateLeadSchema.parse(data);
  return this.leadsService.create(validated);
}

// Next.js usage
const handleSubmit = async (data: CreateLeadDto) => {
  // Validate before sending
  const validated = CreateLeadSchema.parse(data);
  await fetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
};
```

**Decision 4.2:** TypeORM Entities as Source of Truth

```typescript
// packages/database/src/entities/conversation.entity.ts
@Entity('conversations')
@Index(['tenant_id', 'created_at'])
@Index(['tenant_id', 'status'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  contact_id: string;

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'abandoned', 'human_active']
  })
  status: string;

  @Column({ type: 'int', default: 0 })
  sequence_number: number; // For message ordering

  @Column({ type: 'boolean', default: false })
  automation_flag: boolean; // True if no human messages

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}
```

**Decision 4.3:** Shared Types in `packages/types`

```typescript
// packages/types/src/index.ts
export * from './schemas/lead.schema';
export * from './schemas/conversation.schema';
export * from './schemas/booking.schema';

// DTOs
export interface ConversationDto {
  id: string;
  tenant_id: string;
  contact_id: string;
  status: 'active' | 'completed' | 'abandoned' | 'human_active';
  automation_flag: boolean;
  created_at: string;
  messages?: MessageDto[];
}

// Enums
export enum LeadStage {
  NEW = 'new',
  QUALIFIED = 'qualified',
  BOOKING_CREATED = 'booking_created',
  IN_FOLLOW_UP = 'in_follow_up',
  WON = 'won',
  LOST = 'lost',
}
```

**Decision 4.4:** Fetch + Shared Types for Frontend

```typescript
// apps/web/src/lib/api/conversations.ts
import { ConversationDto } from '@drive-insight/types';

export async function getConversations(): Promise<ConversationDto[]> {
  const res = await fetch('/api/conversations', {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch conversations');

  return res.json(); // Type-safe: returns ConversationDto[]
}

// React component
import { getConversations } from '@/lib/api/conversations';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);

  useEffect(() => {
    getConversations().then(setConversations);
  }, []);

  return (
    <div>
      {conversations.map(convo => (
        <ConversationCard key={convo.id} conversation={convo} />
      ))}
    </div>
  );
}
```

**Decision 4.5:** TypeORM + PostgreSQL RLS with Session Variables

**Hybrid Migration Strategy:**
- TypeORM migrations for schema changes
- Supabase migrations for RLS policies (SQL)

```bash
# TypeORM migration
npm run typeorm migration:generate -- -n AddSequenceNumberToMessages
npm run typeorm migration:run

# Supabase migration for RLS
supabase migration new add_rls_policies_for_messages
# Edit SQL file with RLS policies
supabase db push
```

**Database Index Recommendations:**

```sql
-- Conversations
CREATE INDEX idx_conversations_tenant_created ON conversations(tenant_id, created_at DESC);
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);

-- Messages
CREATE INDEX idx_messages_conversation_sequence ON messages(conversation_id, sequence_number);
CREATE INDEX idx_messages_tenant_created ON messages(tenant_id, created_at DESC);
CREATE INDEX idx_messages_external_id ON messages(external_message_id); -- Idempotency

-- Leads
CREATE INDEX idx_leads_tenant_stage ON leads(tenant_id, stage);
CREATE INDEX idx_leads_assigned_agent ON leads(assigned_agent_id, stage);
CREATE INDEX idx_leads_temperature ON leads(tenant_id, temperature);
CREATE INDEX idx_leads_created ON leads(tenant_id, created_at DESC);

-- Bookings
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_slot_time ON bookings(slot_time); -- Availability checks
CREATE INDEX idx_bookings_contact ON bookings(contact_id);

-- AI Metrics
CREATE INDEX idx_ai_metrics_tenant_created ON ai_metrics(tenant_id, created_at DESC);
CREATE INDEX idx_ai_metrics_conversation ON ai_metrics(conversation_id);
CREATE INDEX idx_ai_metrics_automation ON ai_metrics(tenant_id, automation_flag, created_at);

-- Cost Tracking
CREATE INDEX idx_cost_tracking_tenant_service ON cost_tracking(tenant_id, service, created_at DESC);
```

**Affects:** All data operations, type safety, development velocity

---

## Category 5: Monitoring & Observability

**Decision 5.1:** Winston → Grafana Cloud Loki

```typescript
// apps/api/src/config/logger.config.ts
import winston from 'winston';
import LokiTransport from 'winston-loki';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new LokiTransport({
      host: process.env.GRAFANA_CLOUD_LOKI_URL,
      basicAuth: `${process.env.GRAFANA_CLOUD_LOKI_USER}:${process.env.GRAFANA_CLOUD_LOKI_API_KEY}`,
      labels: {
        app: 'drive-insight-api',
        environment: process.env.NODE_ENV,
      },
      json: true,
      replaceTimestamp: true,
    }),
  ],
});

// Usage
logger.info('Lead created', {
  tenant_id: 'abc-123',
  lead_id: 'lead-456',
  temperature: 'HOT',
  channel: 'whatsapp',
  user_id: 'user-789',
});

logger.error('Booking conflict detected', {
  tenant_id: 'abc-123',
  booking_id: 'book-456',
  slot_time: '2026-02-10T14:00:00Z',
  error: err.message,
  stack: err.stack,
});
```

**Decision 5.2:** Grafana Cloud Alerts

```yaml
# Grafana Alert Rules
alerts:
  - name: High Error Rate
    query: 'rate({app="drive-insight-api", level="error"}[5m]) > 10'
    for: 5m
    annotations:
      summary: "High error rate detected"
      description: "{{ $value }} errors/sec"
    actions:
      - type: slack
        channel: "#alerts"

  - name: Booking Conflict Errors
    query: '{app="drive-insight-api"} |= "Booking conflict"'
    for: 1m
    annotations:
      summary: "Booking conflicts detected"
    actions:
      - type: email
        to: "support@driveinsight.com"
```

**Decision 5.3:** Prometheus Client → Grafana Cloud

```typescript
// apps/api/src/config/metrics.config.ts
import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics({ prefix: 'drive_insight_' });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
});

export const conversationTotal = new Counter({
  name: 'conversations_total',
  help: 'Total conversations',
  labelNames: ['tenant_id', 'status', 'automation_flag'],
});

export const llmCostTotal = new Counter({
  name: 'llm_cost_usd_total',
  help: 'Total LLM cost in USD',
  labelNames: ['tenant_id', 'model', 'operation'],
});

export const bookingConflictTotal = new Counter({
  name: 'booking_conflicts_total',
  help: 'Total booking conflicts',
  labelNames: ['tenant_id'],
});

// Push to Grafana Cloud
import axios from 'axios';

setInterval(async () => {
  try {
    const metrics = await register.metrics();
    await axios.post(
      process.env.GRAFANA_CLOUD_PROMETHEUS_URL,
      metrics,
      {
        auth: {
          username: process.env.GRAFANA_CLOUD_PROMETHEUS_USER,
          password: process.env.GRAFANA_CLOUD_PROMETHEUS_API_KEY,
        },
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  } catch (err) {
    logger.error('Failed to push metrics to Grafana Cloud', { error: err.message });
  }
}, 15000); // Every 15 seconds
```

**Decision 5.4:** Supabase + Grafana Postgres Data Source

```sql
-- Grafana Dashboard Query: Automation Rate
SELECT
  date_trunc('hour', created_at) as time,
  tenant_id,
  COUNT(*) FILTER (WHERE automation_flag = true)::float / COUNT(*) as automation_rate,
  COUNT(*) as total_conversations,
  COUNT(*) FILTER (WHERE automation_flag = true) as automated_conversations
FROM conversations
WHERE $__timeFilter(created_at)
  AND tenant_id = ANY($tenant_ids)
GROUP BY 1, 2
ORDER BY 1 DESC;

-- Cost per Tenant
SELECT
  date_trunc('day', created_at) as time,
  tenant_id,
  SUM(cost_usd) as total_cost,
  AVG(tokens_used) as avg_tokens
FROM cost_tracking
WHERE $__timeFilter(created_at)
  AND service = 'openai'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

**Decision 5.5 & 5.6:** Custom Metrics for Cost & Infrastructure

```typescript
// Track LLM costs
async callLLM(prompt: string, tenantId: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  const costUsd = this.calculateCost(response.usage, 'gpt-4');

  // Prometheus metric
  llmCostTotal.inc({ tenant_id: tenantId, model: 'gpt-4', operation: 'completion' }, costUsd);

  // Database record
  await this.costRepo.save({
    tenant_id: tenantId,
    service: 'openai',
    operation: 'completion',
    model: 'gpt-4',
    tokens_used: response.usage.total_tokens,
    cost_usd: costUsd,
  });

  return response;
}
```

**Grafana Free Tier:**
- 50GB logs/month
- 10,000 metric series
- 14 days log retention
- 13 months metric retention

**Affects:** Operations, debugging, SLA tracking, cost optimization

---

## Additional Critical Decisions

**CI/CD Pipeline:** GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Hostinger
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker build -t drive-insight-api:${{ github.sha }} ./apps/api
          docker build -t drive-insight-web:${{ github.sha }} ./apps/web
          docker build -t drive-insight-admin:${{ github.sha }} ./apps/admin

      - name: Deploy to Hostinger
        run: |
          ssh ${{ secrets.HOSTINGER_USER }}@${{ secrets.HOSTINGER_HOST }} << 'EOF'
            cd /opt/drive-insight
            docker compose pull
            docker compose up -d
            docker system prune -f
          EOF
```

**Secrets Management:** Docker Secrets

```yaml
# docker-compose.prod.yml
services:
  api:
    secrets:
      - db_password
      - jwt_secret
      - openai_api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  openai_api_key:
    file: ./secrets/openai_api_key.txt
```

**Backup Strategy:**
- Supabase automated backups (daily, 7-day retention on free tier)
- Hostinger VPS snapshots (weekly manual snapshots)
- n8n workflow exports to Git (manual JSON exports before changes)

**Testing Strategy:**
- Unit tests: Jest for services and components
- Integration tests: Supabase local database
- E2E tests: Playwright for critical user flows

```bash
# Integration tests with Supabase local
supabase start
npm run test:integration
supabase stop
```

**Email & Notifications:**
- Supabase Auth for password reset/verification emails
- Resend for transactional emails (booking confirmations, lead assignments)
- ManyChat for customer communications (WhatsApp/Messenger)

**File Storage:** Supabase Storage

```typescript
// Upload dealership logo
const { data, error } = await supabase.storage
  .from('dealership-assets')
  .upload(`${tenantId}/logo.png`, file, {
    cacheControl: '3600',
    upsert: true,
  });

// RLS policy on storage bucket
CREATE POLICY tenant_storage_isolation ON storage.objects
  USING (bucket_id = 'dealership-assets' AND tenant_id = (storage.foldername(name))[1]);
```

**Environments:**
- Development: Local docker-compose
- Production: Hostinger VPS

**CORS Strategy:** Next.js Proxy

```typescript
// apps/web/next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://api:3000/api/:path*',
      },
    ];
  },
};
```

**Webhook Security:** Signature Verification

```typescript
@Post('/webhooks/manychat/:tenantId')
async handleManyChat(
  @Param('tenantId') tenantId: string,
  @Headers('x-manychat-signature') signature: string,
  @Body() payload: any,
) {
  // Verify signature
  const credentials = await this.getCredentials(tenantId, 'manychat');
  const expectedSig = crypto
    .createHmac('sha256', credentials.webhook_secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (signature !== expectedSig) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  return this.webhookService.process(tenantId, payload);
}
```

---

## Superuser Administration Layer

**Decision:** Separate Admin Application

**Monorepo Structure:**
```
drive-insight/
├── apps/
│   ├── web/          # Tenant dashboard (RLS enforced, tenant-scoped)
│   ├── admin/        # Superuser dashboard (RLS bypassed, cross-tenant access)
│   └── api/          # Shared API (detects admin vs tenant requests)
```

**Admin Authentication:** Simple Password (Separate from Tenant Auth)

```typescript
// apps/admin/src/lib/auth.ts
import bcrypt from 'bcrypt';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string; // Your email

  @Column()
  password_hash: string;

  @Column({ default: true })
  is_active: boolean;

  // No tenant_id - admins are global
}

// Login endpoint (admin-only)
@Post('/admin/auth/login')
async login(@Body() { email, password }: AdminLoginDto) {
  const admin = await this.adminRepo.findOne({ where: { email, is_active: true } });

  if (!admin || !await bcrypt.compare(password, admin.password_hash)) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Issue admin JWT (different secret from tenant JWT)
  const token = jwt.sign(
    { sub: admin.id, email: admin.email, role: 'superuser' },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );

  return { token };
}
```

**Admin Supabase Client (Bypasses RLS):**

```typescript
// apps/admin/src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Full access, no RLS
);

// Admin can query across all tenants
const allConversations = await supabaseAdmin
  .from('conversations')
  .select('*, tenant:tenants(name)')
  .order('created_at', { ascending: false })
  .limit(100);
```

**Admin Capabilities:**

1. **Tenant Onboarding**
```typescript
// apps/admin/src/app/tenants/onboard/actions.ts
async function onboardTenant(data: OnboardTenantDto) {
  // 1. Create tenant
  const tenant = await supabaseAdmin
    .from('tenants')
    .insert({
      name: data.dealershipName,
      branch: data.branch,
      status: 'active',
    })
    .select()
    .single();

  // 2. Create owner account
  const { user } = await supabaseAdmin.auth.admin.createUser({
    email: data.ownerEmail,
    password: generateRandomPassword(),
    email_confirm: true,
    user_metadata: {
      tenant_id: tenant.id,
      role: 'owner',
    },
  });

  // 3. Setup default routing rules
  await supabaseAdmin.from('routing_rules').insert({
    tenant_id: tenant.id,
    name: 'Default',
    channels: ['whatsapp', 'messenger'],
    priority: 1,
  });

  // 4. Generate webhook endpoint
  const webhookUrl = `https://api.driveinsight.com/webhooks/manychat/${tenant.id}`;

  // 5. Create integration placeholder
  await supabaseAdmin.from('tenant_integrations').insert({
    tenant_id: tenant.id,
    integration_type: 'manychat',
    encrypted_credentials: null, // Owner will configure
  });

  return { tenant, webhookUrl, ownerEmail: data.ownerEmail };
}
```

2. **Cross-Tenant Analytics**
```typescript
// apps/admin/src/app/analytics/page.tsx
async function getCrossTenantMetrics() {
  // Aggregate metrics across all tenants
  const metrics = await supabaseAdmin
    .rpc('get_cross_tenant_metrics', {
      start_date: startDate,
      end_date: endDate,
    });

  return {
    totalConversations: metrics.total_conversations,
    avgAutomationRate: metrics.avg_automation_rate,
    totalCost: metrics.total_cost,
    tenants: metrics.tenant_breakdown,
  };
}
```

3. **Tenant Management (Pause/Suspend)**
```typescript
// apps/admin/src/app/tenants/[id]/actions.ts
async function pauseTenant(tenantId: string, reason: string) {
  await supabaseAdmin
    .from('tenants')
    .update({
      status: 'paused',
      paused_reason: reason,
      paused_at: new Date().toISOString(),
    })
    .eq('id', tenantId);

  // Optionally: Disable webhook processing for paused tenants
  logger.info('Tenant paused', { tenant_id: tenantId, reason });
}

async function suspendTenant(tenantId: string, reason: string) {
  await supabaseAdmin
    .from('tenants')
    .update({
      status: 'suspended',
      suspended_reason: reason,
      suspended_at: new Date().toISOString(),
    })
    .eq('id', tenantId);

  // Suspend all users for this tenant
  const users = await supabaseAdmin
    .from('tenant_users')
    .select('user_id')
    .eq('tenant_id', tenantId);

  for (const user of users) {
    await supabaseAdmin.auth.admin.updateUserById(user.user_id, {
      ban_duration: 'indefinite',
    });
  }

  logger.warn('Tenant suspended', { tenant_id: tenantId, reason });
}
```

**Admin Dashboard Features:**
- Tenant onboarding wizard
- Cross-tenant analytics (automation rate, costs, conversations)
- Tenant status management (active, paused, suspended)
- System health overview (API uptime, database connections, integration status)
- Cost monitoring dashboard (LLM usage, per-tenant costs)

**Security:**
- Separate authentication (admin JWT vs tenant JWT)
- IP allowlisting (optional additional layer)
- Audit logging for all admin actions
- No RLS enforcement (admin uses service role key)

**Affects:** Tenant management, system operations, business analytics

---

## Decision Impact Analysis

**Implementation Sequence:**

1. **Epic 0: Project Setup**
   - Initialize Turborepo monorepo
   - Set up TypeORM + Supabase connection
   - Configure Docker Compose
   - Set up GitHub Actions CI/CD
   - Create admin app scaffold

2. **Epic 1: Authentication & Multi-Tenancy**
   - Implement Supabase JWT verification
   - Create RLS policies
   - Build tenant context interceptor
   - Set up connection pooling

3. **Epic 2: Core Data Models**
   - Create TypeORM entities (14 tables from PRD)
   - Generate and run migrations
   - Set up database indexes
   - Configure Zod schemas

4. **Epic 3: API Foundation**
   - Build NestJS modules
   - Implement CRUD endpoints
   - Add Swagger documentation
   - Set up rate limiting

5. **Epic 4: LangGraph Integration**
   - Embed LangGraph in NestJS
   - Create conversation processing graph
   - Implement structured outputs
   - Add cost tracking

6. **Epic 5: Monitoring & Observability**
   - Configure Grafana Cloud
   - Set up Winston → Loki
   - Implement Prometheus metrics
   - Create Grafana dashboards

7. **Epic 6: Admin Application**
   - Build admin dashboard
   - Implement onboarding wizard
   - Create cross-tenant analytics
   - Add tenant management features

**Cross-Component Dependencies:**
- TypeORM entities → API services → Frontend components
- RLS policies → Session variables → Tenant context interceptor
- Zod schemas → NestJS validation → Frontend forms
- LangGraph → Cost tracking → Grafana dashboards
- Admin app → Supabase service role → Cross-tenant queries

**Migration Path:**
- Supabase PostgreSQL → AWS Aurora PostgreSQL: Update connection string, RLS policies remain
- Hostinger VPS → AWS ECS/Fargate: Same Docker images, swap orchestration
- Grafana Cloud → Self-hosted: Same metrics/logs format, change push endpoints
- LangGraph embedded → Separate service: Extract module, add HTTP interface

---

