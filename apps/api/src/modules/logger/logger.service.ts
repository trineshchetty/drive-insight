import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

// Use require for winston-loki due to module compatibility
const LokiTransport = require('winston-loki');

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;
  private tenantId?: string;

  constructor() {
    const transports: winston.transport[] = [
      // Console transport for local development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, tenantId, ...meta }: any) => {
            const tenant = tenantId ? `[${tenantId}]` : '';
            const ctx = context ? `[${context}]` : '';
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} ${level} ${tenant}${ctx} ${message} ${metaStr}`;
          }),
        ),
      }),
    ];

    // Add Loki transport if configured
    if (process.env.LOKI_HOST && process.env.LOKI_USERNAME && process.env.LOKI_PASSWORD) {
      console.log(`[Logger] Initializing Loki transport to ${process.env.LOKI_HOST}`);

      try {
        const lokiTransport = new LokiTransport({
          host: process.env.LOKI_HOST,
          labels: {
            app: 'drive-insight-api',
            environment: process.env.NODE_ENV || 'development',
          },
          json: true,
          basicAuth: `${process.env.LOKI_USERNAME}:${process.env.LOKI_PASSWORD}`,
          format: winston.format.json(),
          replaceTimestamp: true,
          batching: true,
          interval: 5, // Send logs every 5 seconds (default is 30)
          onConnectionError: (err: any) => {
            console.error('[Logger] Loki connection error:', err);
          },
        });

        // Add event listeners to debug
        (lokiTransport as any).on('error', (err: any) => {
          console.error('[Logger] Loki transport error:', err);
        });

        (lokiTransport as any).on('finish', () => {
          console.log('[Logger] Loki transport finished batch');
        });

        transports.push(lokiTransport);
        console.log('[Logger] Loki transport configured with 5s batching interval');
      } catch (error) {
        console.error('[Logger] Failed to initialize Loki transport:', error);
      }
    } else {
      console.log('[Logger] Loki transport not configured - logs will only go to console');
      console.log(`[Logger] LOKI_HOST: ${process.env.LOKI_HOST ? 'set' : 'not set'}`);
      console.log(`[Logger] LOKI_USERNAME: ${process.env.LOKI_USERNAME ? 'set' : 'not set'}`);
      console.log(`[Logger] LOKI_PASSWORD: ${process.env.LOKI_PASSWORD ? 'set' : 'not set'}`);
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
  }

  private formatMessage(message: any, meta?: any) {
    return {
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      context: this.context,
      tenant_id: this.tenantId,
      ...meta,
    };
  }

  log(message: any, context?: string, meta?: any) {
    const ctx = context || this.context;
    this.logger.info(message, this.formatMessage(message, { context: ctx, ...meta }));
  }

  error(message: any, trace?: string, context?: string, meta?: any) {
    const ctx = context || this.context;
    this.logger.error(message, this.formatMessage(message, { context: ctx, trace, ...meta }));
  }

  warn(message: any, context?: string, meta?: any) {
    const ctx = context || this.context;
    this.logger.warn(message, this.formatMessage(message, { context: ctx, ...meta }));
  }

  debug(message: any, context?: string, meta?: any) {
    const ctx = context || this.context;
    this.logger.debug(message, this.formatMessage(message, { context: ctx, ...meta }));
  }

  verbose(message: any, context?: string, meta?: any) {
    const ctx = context || this.context;
    this.logger.verbose(message, this.formatMessage(message, { context: ctx, ...meta }));
  }

  info(message: any, meta?: any) {
    this.logger.info(message, this.formatMessage(message, meta));
  }
}
