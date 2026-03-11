import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './modules/logger';

async function bootstrap() {
  // Create logger instance directly to avoid DI scope issues
  const logger = new LoggerService();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: logger,
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO types
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS (will be configured properly in later stories)
  app.enableCors();

  // Swagger documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Drive Insight API')
      .setDescription('Multi-tenant dealership lead management and AI automation platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health', 'Health check endpoints')
      .addTag('metrics', 'Prometheus metrics')
      .addTag('auth', 'Authentication endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.info('Swagger documentation available at /api/docs');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.info(`API server running on http://localhost:${port}/api`);
}

bootstrap();
