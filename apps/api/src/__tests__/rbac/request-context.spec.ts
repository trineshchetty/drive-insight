import { RequestContext, RequestContextData } from '../../common/context/request-context';

describe('RequestContext', () => {
  const mockContextData: RequestContextData = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    role: 'owner',
    email: 'owner@example.com',
  };

  it('should return undefined when called outside request context', () => {
    expect(RequestContext.getCurrentUserId()).toBeUndefined();
    expect(RequestContext.getCurrentTenantId()).toBeUndefined();
    expect(RequestContext.getCurrentRole()).toBeUndefined();
    expect(RequestContext.getEmail()).toBeUndefined();
    expect(RequestContext.getAll()).toBeUndefined();
  });

  it('should provide context data within run callback', async () => {
    await RequestContext.run(mockContextData, async () => {
      expect(RequestContext.getCurrentUserId()).toBe('user-123');
      expect(RequestContext.getCurrentTenantId()).toBe('tenant-456');
      expect(RequestContext.getCurrentRole()).toBe('owner');
      expect(RequestContext.getEmail()).toBe('owner@example.com');
    });
  });

  it('should provide full context data via getAll', async () => {
    await RequestContext.run(mockContextData, async () => {
      const all = RequestContext.getAll();
      expect(all).toEqual(mockContextData);
    });
  });

  it('should isolate context between concurrent runs', async () => {
    const context1: RequestContextData = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'agent',
      email: 'agent1@example.com',
    };

    const context2: RequestContextData = {
      userId: 'user-2',
      tenantId: 'tenant-2',
      role: 'manager',
      email: 'manager@example.com',
    };

    const promise1 = RequestContext.run(context1, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(RequestContext.getCurrentUserId()).toBe('user-1');
      expect(RequestContext.getCurrentRole()).toBe('agent');
    });

    const promise2 = RequestContext.run(context2, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(RequestContext.getCurrentUserId()).toBe('user-2');
      expect(RequestContext.getCurrentRole()).toBe('manager');
    });

    await Promise.all([promise1, promise2]);
  });

  it('should clear context after run completes', async () => {
    await RequestContext.run(mockContextData, async () => {
      expect(RequestContext.getCurrentUserId()).toBe('user-123');
    });

    // Context should be cleared after callback completes
    expect(RequestContext.getCurrentUserId()).toBeUndefined();
  });

  it('should preserve context across nested async operations', async () => {
    await RequestContext.run(mockContextData, async () => {
      const asyncOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return RequestContext.getCurrentRole();
      };

      const role = await asyncOperation();
      expect(role).toBe('owner');
    });
  });
});
