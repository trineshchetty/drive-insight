// Base TypeScript interfaces (stubs for now)
export interface User {
  id: string;
  email: string;
  tenant_id: string;
  role: 'owner' | 'manager' | 'agent';
}

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'suspended';
}

// Zod schemas will be added in subsequent stories
export * from './schemas';
