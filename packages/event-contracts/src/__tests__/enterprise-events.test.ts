import { describe, it, expect } from 'vitest';
import { EnterpriseCreatedSchema } from '../enterprise-events';

describe('EnterpriseCreated event contract', () => {
  const validEvent = {
    event_id: '550e8400-e29b-41d4-a716-446655440000',
    event_type: 'EnterpriseCreated',
    event_version: '1.0',
    timestamp: '2024-01-01T00:00:00.000Z',
    correlation_id: '550e8400-e29b-41d4-a716-446655440001',
    tenant_id: '550e8400-e29b-41d4-a716-446655440002',
    source: 'enterprise-service',
    payload: {
      enterprise_id: '550e8400-e29b-41d4-a716-446655440003',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
    },
  };

  it('should validate a valid EnterpriseCreated event', () => {
    const result = EnterpriseCreatedSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('should reject event with missing enterprise_id', () => {
    const invalid = {
      ...validEvent,
      payload: { tenant_id: validEvent.payload.tenant_id },
    };
    const result = EnterpriseCreatedSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject event with invalid UUID in payload', () => {
    const invalid = {
      ...validEvent,
      payload: { enterprise_id: 'not-a-uuid', tenant_id: validEvent.payload.tenant_id },
    };
    const result = EnterpriseCreatedSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject event with wrong event_type', () => {
    const invalid = { ...validEvent, event_type: 'WrongType' };
    const result = EnterpriseCreatedSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
