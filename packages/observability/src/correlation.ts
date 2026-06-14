import { randomUUID } from 'crypto';

/**
 * Correlation ID management for distributed tracing.
 * Ensures all related operations share a correlation context.
 */

export interface CorrelationContext {
  correlation_id: string;
  tenant_id?: string;
  source?: string;
}

/** Generate a new correlation ID */
export function generateCorrelationId(): string {
  return randomUUID();
}

/** Create a correlation context for a new operation */
export function createCorrelationContext(
  tenant_id?: string,
  source?: string,
): CorrelationContext {
  return {
    correlation_id: generateCorrelationId(),
    tenant_id,
    source,
  };
}

/** Extract correlation context from event metadata */
export function extractCorrelationContext(
  event: Record<string, unknown>,
): CorrelationContext {
  return {
    correlation_id: (event.correlation_id as string) ?? generateCorrelationId(),
    tenant_id: event.tenant_id as string | undefined,
    source: event.source as string | undefined,
  };
}
