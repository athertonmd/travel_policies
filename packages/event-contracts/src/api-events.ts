import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * API Events (Project 8 addition).
 * Justification: External API access must be auditable per BR-043.
 * These events track third-party policy retrieval for compliance and monitoring.
 */

export const PolicyRetrievedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyRetrieved'),
  payload: z.object({
    policy_id: z.string().uuid(),
  }),
});

export const PolicyViewedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyViewed'),
  payload: z.object({
    policy_id: z.string().uuid(),
  }),
});

export const PolicyExportedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyExported'),
  payload: z.object({
    policy_id: z.string().uuid(),
  }),
});

export type PolicyRetrieved = z.infer<typeof PolicyRetrievedSchema>;
export type PolicyViewed = z.infer<typeof PolicyViewedSchema>;
export type PolicyExported = z.infer<typeof PolicyExportedSchema>;
