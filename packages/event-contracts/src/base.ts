import { z } from 'zod';

/**
 * Base event envelope schema.
 * All domain events carry metadata for tracing and auditing.
 */
export const BaseEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string(),
  event_version: z.string().default('1.0'),
  timestamp: z.string().datetime(),
  correlation_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  source: z.string(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;
