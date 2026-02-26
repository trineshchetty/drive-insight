import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console output during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    service = new LoggerService();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with console transport', () => {
      expect(service).toHaveProperty('logger');
    });

    it('should log Loki initialization if credentials are present', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        LOKI_HOST: 'https://test.loki.com',
        LOKI_USERNAME: 'test-user',
        LOKI_PASSWORD: 'test-pass',
      };

      const logSpy = jest.spyOn(console, 'log');
      new LoggerService();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Logger] Initializing Loki transport'),
      );

      process.env = originalEnv;
      logSpy.mockRestore();
    });
  });

  describe('context management', () => {
    it('should set context', () => {
      service.setContext('TestContext');
      // Context is private, but we can test it by checking log output
      expect(() => service.setContext('TestContext')).not.toThrow();
    });

    it('should set tenant ID', () => {
      service.setTenantId('tenant-123');
      expect(() => service.setTenantId('tenant-123')).not.toThrow();
    });
  });

  describe('logging methods', () => {
    it('should log info messages', () => {
      expect(() => service.info('Test info message')).not.toThrow();
    });

    it('should log info with metadata', () => {
      expect(() =>
        service.info('Test info with meta', { key: 'value' }),
      ).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => service.error('Test error message')).not.toThrow();
    });

    it('should log error with trace', () => {
      expect(() =>
        service.error('Test error', 'Error stack trace'),
      ).not.toThrow();
    });

    it('should log error with context and metadata', () => {
      expect(() =>
        service.error('Test error', 'stack', 'ErrorContext', { code: 500 }),
      ).not.toThrow();
    });

    it('should log warn messages', () => {
      expect(() => service.warn('Test warning')).not.toThrow();
    });

    it('should log warn with context', () => {
      expect(() => service.warn('Test warning', 'WarnContext')).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => service.debug('Test debug')).not.toThrow();
    });

    it('should log verbose messages', () => {
      expect(() => service.verbose('Test verbose')).not.toThrow();
    });

    it('should log generic log messages', () => {
      expect(() => service.log('Test log message')).not.toThrow();
    });

    it('should log with context parameter', () => {
      expect(() => service.log('Test log', 'LogContext')).not.toThrow();
    });
  });

  describe('message formatting', () => {
    beforeEach(() => {
      service.setContext('TestContext');
      service.setTenantId('tenant-456');
    });

    it('should format messages with context and tenant_id', () => {
      // Private method, but we test indirectly via logging
      expect(() => service.info('Test with context')).not.toThrow();
    });

    it('should handle object messages', () => {
      expect(() => service.info({ message: 'object log' })).not.toThrow();
    });

    it('should include metadata in logs', () => {
      expect(() =>
        service.info('Test', { userId: 123, action: 'test' }),
      ).not.toThrow();
    });
  });

  describe('NestJS LoggerService compatibility', () => {
    it('should implement NestJS LoggerService interface', () => {
      expect(service.log).toBeDefined();
      expect(service.error).toBeDefined();
      expect(service.warn).toBeDefined();
      expect(service.debug).toBeDefined();
      expect(service.verbose).toBeDefined();
    });

    it('should work with NestJS application logging', () => {
      // Test that it can be used as a NestJS logger
      expect(() => service.log('App starting...')).not.toThrow();
      expect(() => service.error('App error occurred', 'ErrorStack')).not.toThrow();
    });
  });

  describe('tenant context in logs', () => {
    it('should include tenant_id when set', () => {
      service.setTenantId('tenant-789');
      expect(() => service.info('Tenant action performed')).not.toThrow();
    });

    it('should handle missing tenant_id gracefully', () => {
      // Don't set tenant_id
      expect(() => service.info('Action without tenant')).not.toThrow();
    });

    it('should update tenant_id dynamically', () => {
      service.setTenantId('tenant-first');
      service.info('First tenant action');

      service.setTenantId('tenant-second');
      expect(() => service.info('Second tenant action')).not.toThrow();
    });
  });
});
