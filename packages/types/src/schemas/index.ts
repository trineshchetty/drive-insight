import { z } from 'zod';

// Placeholder Zod schemas - will be expanded in later stories
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  tenant_id: z.string().uuid(),
  role: z.enum(['owner', 'manager', 'agent']),
});

export type UserDto = z.infer<typeof UserSchema>;
