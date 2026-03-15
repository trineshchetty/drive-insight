import { z } from 'zod';

export const UserRoleSchema = z.enum(['owner', 'manager', 'agent']);
export const UserAccountStatusSchema = z.enum([
  'invited',
  'active',
  'disabled',
]);

const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format');

export const WorkingHoursDaySchema = z
  .object({
    enabled: z.boolean(),
    start: TimeStringSchema.nullable(),
    end: TimeStringSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }

    if (!value.start || !value.end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enabled working hours require both start and end times',
      });
      return;
    }

    if (value.start >= value.end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Working hours start time must be earlier than end time',
      });
    }
  });

export const WorkingHoursSchema = z.object({
  monday: WorkingHoursDaySchema,
  tuesday: WorkingHoursDaySchema,
  wednesday: WorkingHoursDaySchema,
  thursday: WorkingHoursDaySchema,
  friday: WorkingHoursDaySchema,
  saturday: WorkingHoursDaySchema,
  sunday: WorkingHoursDaySchema,
});

export const DEFAULT_WORKING_HOURS: z.infer<typeof WorkingHoursSchema> = {
  monday: { enabled: false, start: null, end: null },
  tuesday: { enabled: false, start: null, end: null },
  wednesday: { enabled: false, start: null, end: null },
  thursday: { enabled: false, start: null, end: null },
  friday: { enabled: false, start: null, end: null },
  saturday: { enabled: false, start: null, end: null },
  sunday: { enabled: false, start: null, end: null },
};

export const AgentProfileSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  working_hours: WorkingHoursSchema,
  availability: z.boolean(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  tenant_id: z.string().uuid(),
  role: UserRoleSchema,
  name: z.string().min(1).max(255),
  account_status: UserAccountStatusSchema,
  must_change_password: z.boolean(),
});

export type UserDto = z.infer<typeof UserSchema>;
export type AgentProfileDto = z.infer<typeof AgentProfileSchema>;
export type WorkingHoursDto = z.infer<typeof WorkingHoursSchema>;
export type WorkingHoursDayDto = z.infer<typeof WorkingHoursDaySchema>;
