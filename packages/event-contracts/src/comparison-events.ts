import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Comparison Events (Event Catalogue: Comparison Events)
 */

export const PolicyComparisonStartedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyComparisonStarted'),
  payload: z.object({
    enterprise_id: z.string().uuid(),
    old_version: z.number().int().positive(),
    new_version: z.number().int().positive(),
  }),
});

export const PolicyDifferenceDetectedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyDifferenceDetected'),
  payload: z.object({
    change_id: z.string().uuid(),
    rule_type: z.string(),
  }),
});

export const PolicyComparisonCompletedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyComparisonCompleted'),
  payload: z.object({
    comparison_id: z.string().uuid(),
  }),
});

export type PolicyComparisonStarted = z.infer<typeof PolicyComparisonStartedSchema>;
export type PolicyDifferenceDetected = z.infer<typeof PolicyDifferenceDetectedSchema>;
export type PolicyComparisonCompleted = z.infer<typeof PolicyComparisonCompletedSchema>;
