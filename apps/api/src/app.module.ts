import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './modules/logger';
import { MetricsModule } from './modules/metrics';
import { HttpMetricsMiddleware } from './common/middleware';
import { Tenant, User, AgentProfile, AuditLog } from '@drive-insight/database';

@Module({
  imports: [
    // TypeORM configuration using shared entities from @drive-insight/database
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP metrics middleware
    // Note: TenantMiddleware will be implemented in Story 1.2
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
