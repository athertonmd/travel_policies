import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Tenant Events (Project 2 addition)
 * Tenant lifecycle events for audit and downstream consumers.
 */

export const TenantCreatedSchema = BaseEventSchema.extend({
  event_type: z.literal('TenantCreated'),
  payload: z.object({
    tenant_id: z.string().uuid(),
  }),
});

export const TenantUpdatedSchema = BaseEventSchema.extend({
  event_type: z.literal('TenantUpdated'),
  payload: z.object({
    tenant_id: z.string().uuid(),
  }),
});

export const TenantArchivedSchema = BaseEventSchema.extend({
  event_type: z.literal('TenantArchived'),
  payload: z.object({
    tenant_id: z.string().uuid(),
  }),
});

export type TenantCreated = z.infer<typeof TenantCreatedSchema>;
export type TenantUpdated = z.infer<typeof TenantUpdatedSchema>;
export type TenantArchived = z.infer<typeof TenantArchivedSchema>;
