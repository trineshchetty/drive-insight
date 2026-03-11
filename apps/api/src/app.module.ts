import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './modules/logger';
import { MetricsModule } from './modules/metrics';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HttpMetricsMiddleware } from './common/middleware';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { Tenant, User, AgentProfile, AuditLog } from '@drive-insight/database';

@Module({
  imports: [
    // TypeORM configuration using shared entities from @drive-insight/database
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'host.docker.internal',
      port: parseInt(process.env.DB_PORT || '54322'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [Tenant, User, AgentProfile, AuditLog],
      synchronize: false, // NEVER true in production - use migrations
      logging: process.env.NODE_ENV === 'development',
      extra: {
        max: 25, // Maximum connections in pool
        min: 5, // Minimum connections always open
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    }),
    LoggerModule,
    MetricsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth guard - applies to ALL routes except @Public()
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Global roles guard - enforces @Roles() decorator (runs after SupabaseAuthGuard)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global tenant context - sets session variables for RLS
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP metrics middleware
    // Note: TenantContextInterceptor implemented in Story 1.2 (global interceptor above)
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
