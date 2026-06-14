import { z } from 'zod';
import { BaseEventSchema } from './base';

/**
 * Review Events (Event Catalogue: Review Events)
 */

export const ReviewStartedSchema = BaseEventSchema.extend({
  event_type: z.literal('ReviewStarted'),
  payload: z.object({
    review_id: z.string().uuid(),
    policy_id: z.string().uuid(),
  }),
});

export const RuleApprovedSchema = BaseEventSchema.extend({
  event_type: z.literal('RuleApproved'),
  payload: z.object({
    rule_id: z.string().uuid(),
  }),
});

export const RuleModifiedSchema = BaseEventSchema.extend({
  event_type: z.literal('RuleModified'),
  payload: z.object({
    rule_id: z.string().uuid(),
    old_value: z.string(),
    new_value: z.string(),
  }),
});

export const ReviewCompletedSchema = BaseEventSchema.extend({
  event_type: z.literal('ReviewCompleted'),
  payload: z.object({
    review_id: z.string().uuid(),
  }),
});

/**
 * RuleRejected event (Project 6 addition).
 * Justification: Review workflow requires tracking rejected rules separately
 * from modifications. Rejection removes a rule from the policy version.
 */
export const RuleRejectedSchema = BaseEventSchema.extend({
  event_type: z.literal('RuleRejected'),
  payload: z.object({
    rule_id: z.string().uuid(),
  }),
});

export type ReviewStarted = z.infer<typeof ReviewStartedSchema>;
export type RuleApproved = z.infer<typeof RuleApprovedSchema>;
export type RuleModified = z.infer<typeof RuleModifiedSchema>;
export type ReviewCompleted = z.infer<typeof ReviewCompletedSchema>;
export type RuleRejected = z.infer<typeof RuleRejectedSchema>;
