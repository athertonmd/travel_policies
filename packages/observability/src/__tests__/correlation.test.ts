import { describe, it, expect } from 'vitest';
import { generateCorrelationId, createCorrelationContext, extractCorrelationContext } from '../correlation';

describe('Correlation ID generation', () => {
  it('should generate a valid UUID', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateCorrelationId()));
    expect(ids.size).toBe(100);
  });
});

describe('Correlation context', () => {
  it('should create context with auto-generated correlation_id', () => {
    const ctx = createCorrelationContext('tenant-123', 'test-service');
    expect(ctx.correlation_id).toBeDefined();
    expect(ctx.tenant_id).toBe('tenant-123');
    expect(ctx.source).toBe('test-service');
  });

  it('should extract context from event with correlation_id', () => {
    const event = {
      correlation_id: '550e8400-e29b-41d4-a716-446655440000',
      tenant_id: 'tenant-abc',
      source: 'enterprise-service',
    };
    const ctx = extractCorrelationContext(event);
    expect(ctx.correlation_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(ctx.tenant_id).toBe('tenant-abc');
  });

  it('should generate a new correlation_id if none present', () => {
    const ctx = extractCorrelationContext({});
    expect(ctx.correlation_id).toBeDefined();
    expect(ctx.correlation_id.length).toBe(36);
  });
});
