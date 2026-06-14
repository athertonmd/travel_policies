import { describe, it, expect } from 'vitest';
import { createTracer } from '../tracing';

describe('Event tracing', () => {
  it('should create a tracer for a service', () => {
    const tracer = createTracer({ service: 'test-service' });
    expect(tracer).toBeDefined();
    expect(tracer.startSpan).toBeTypeOf('function');
    expect(tracer.endSpan).toBeTypeOf('function');
  });

  it('should start a span with operation name', () => {
    const tracer = createTracer({ service: 'enterprise-service' });
    const span = tracer.startSpan('createEnterprise', { tenant_id: 'abc' });
    expect(span.operation).toBe('createEnterprise');
    expect(span.service).toBe('enterprise-service');
    expect(span.trace_id).toBeDefined();
    expect(span.span_id).toBeDefined();
    expect(span.start_time).toBeDefined();
    expect(span.status).toBe('ok');
    expect(span.attributes).toEqual({ tenant_id: 'abc' });
  });

  it('should end a span with status', () => {
    const tracer = createTracer({ service: 'test' });
    const span = tracer.startSpan('operation');
    const ended = tracer.endSpan(span, 'error');
    expect(ended.end_time).toBeDefined();
    expect(ended.status).toBe('error');
  });

  it('should use provided trace_id if given', () => {
    const tracer = createTracer({ service: 'test', trace_id: 'custom-trace' });
    const span = tracer.startSpan('op');
    expect(span.trace_id).toBe('custom-trace');
  });
});
