export * from './schemas';

export type UserRole = 'owner' | 'manager' | 'agent';
export type UserAccountStatus = 'invited' | 'active' | 'disabled';

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  role: UserRole;
  name: string;
  account_status: UserAccountStatus;
  must_change_password: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'suspended';
}
