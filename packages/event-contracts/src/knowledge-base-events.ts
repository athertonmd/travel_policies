import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Knowledge Base Events (Event Catalogue: Knowledge Base Events)
 */

export const PolicyIndexedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyIndexed'),
  payload: z.object({
    policy_id: z.string().uuid(),
  }),
});

export const PolicyEmbeddingCreatedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyEmbeddingCreated'),
  payload: z.object({
    embedding_id: z.string().uuid(),
  }),
});

export type PolicyIndexed = z.infer<typeof PolicyIndexedSchema>;
export type PolicyEmbeddingCreated = z.infer<typeof PolicyEmbeddingCreatedSchema>;
