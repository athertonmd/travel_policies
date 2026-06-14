import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Policy Assistant Events (Project 12).
 * Justification: Q&A interactions must be auditable per BR-043.
 */

export const PolicyQuestionAskedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyQuestionAsked'),
  payload: z.object({
    enterprise_id: z.string().uuid(),
    conversation_id: z.string().uuid(),
  }),
});

export const PolicyAnswerGeneratedSchema = BaseEventSchema.extend({
  event_type: z.literal('PolicyAnswerGenerated'),
  payload: z.object({
    enterprise_id: z.string().uuid(),
    conversation_id: z.string().uuid(),
    confidence: z.number(),
  }),
});

export type PolicyQuestionAsked = z.infer<typeof PolicyQuestionAskedSchema>;
export type PolicyAnswerGenerated = z.infer<typeof PolicyAnswerGeneratedSchema>;
