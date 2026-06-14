import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Enterprise Events (Event Catalogue: Enterprise Events)
 */

export const EnterpriseCreatedSchema = BaseEventSchema.extend({
  event_type: z.literal('EnterpriseCreated'),
  payload: z.object({
    enterprise_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
  }),
});

export const EnterpriseUpdatedSchema = BaseEventSchema.extend({
  event_type: z.literal('EnterpriseUpdated'),
  payload: z.object({
    enterprise_id: z.string().uuid(),
  }),
});

export const EnterpriseArchivedSchema = BaseEventSchema.extend({
  event_type: z.literal('EnterpriseArchived'),
  payload: z.object({
    enterprise_id: z.string().uuid(),
  }),
});

export type EnterpriseCreated = z.infer<typeof EnterpriseCreatedSchema>;
export type EnterpriseUpdated = z.infer<typeof EnterpriseUpdatedSchema>;
export type EnterpriseArchived = z.infer<typeof EnterpriseArchivedSchema>;
