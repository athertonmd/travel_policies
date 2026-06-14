import { randomUUID } from 'crypto';

/**
 * Event tracing interfaces for TPIP.
 * Foundation only — no AWS integration.
 */

export interface TraceSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation: string;
  service: string;
  start_time: string;
  end_time?: string;
  status: 'ok' | 'error';
  attributes?: Record<string, unknown>;
}

export interface Tracer {
  startSpan(operation: string, attributes?: Record<string, unknown>): TraceSpan;
  endSpan(span: TraceSpan, status?: 'ok' | 'error'): TraceSpan;
}

export interface TracerOptions {
  service: string;
  trace_id?: string;
}

/** Create a tracer instance (foundation — logs locally) */
export function createTracer(options: TracerOptions): Tracer {
  const { service, trace_id } = options;

  function generateId(): string {
    return randomUUID();
  }

  return {
    startSpan(operation, attributes) {
      return {
        trace_id: trace_id ?? generateId(),
        span_id: generateId(),
        operation,
        service,
        start_time: new Date().toISOString(),
        status: 'ok',
        attributes,
      };
    },
    endSpan(span, status = 'ok') {
      return {
        ...span,
        end_time: new Date().toISOString(),
        status,
      };
    },
  };
}
