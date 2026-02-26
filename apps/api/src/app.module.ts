import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './modules/logger';
import { MetricsModule } from './modules/metrics';
import { HttpMetricsMiddleware, TenantMiddleware } from './common/middleware';

@Module({
  imports: [LoggerModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware first to extract tenant_id
    consumer.apply(TenantMiddleware).forRoutes('*');

    // Then apply metrics middleware (which will have access to tenantId)
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
