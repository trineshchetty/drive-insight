import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const mockExecutionContext = (
    user: any,
    roles?: string[],
    isPublic = false,
  ): ExecutionContext => {
    const request = { user };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    if (roles) {
      jest.spyOn(reflector, 'get').mockReturnValue(roles);
    } else {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    }

    return context;
  };

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = mockExecutionContext({ role: 'agent' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role (owner)', () => {
      const context = mockExecutionContext({ role: 'owner' }, ['owner', 'manager']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role (manager)', () => {
      const context = mockExecutionContext({ role: 'manager' }, ['owner', 'manager']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      const context = mockExecutionContext({ role: 'agent' }, ['owner', 'manager']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with correct message', () => {
      const context = mockExecutionContext({ role: 'agent' }, ['owner']);
      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Insufficient permissions: requires one of [owner]'),
      );
    });

    it('should handle single role requirement', () => {
      const context = mockExecutionContext({ role: 'owner' }, ['owner']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw when user role is undefined', () => {
      const context = mockExecutionContext({ id: '123' }, ['owner']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access to @Public() routes regardless of role', () => {
      const context = mockExecutionContext({ role: 'agent' }, ['owner'], true);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access to @Public() routes even without user', () => {
      const context = mockExecutionContext(undefined, ['owner'], true);
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
