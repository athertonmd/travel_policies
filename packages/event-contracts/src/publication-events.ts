import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Publication Events (Event Catalogue: Publication Events)
 */

export const PolicyApprovedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyApproved'),
  payload: z.object({
    policy_id: z.string().uuid(),
  }),
});

export const PolicyPublishedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyPublished'),
  payload: z.object({
    policy_id: z.string().uuid(),
    version_number: z.number().int().positive(),
  }),
});

export type PolicyApproved = z.infer<typeof PolicyApprovedSchema>;
export type PolicyPublished = z.infer<typeof PolicyPublishedSchema>;
