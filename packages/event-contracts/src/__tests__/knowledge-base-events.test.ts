import { describe, it, expect } from 'vitest';
import { PolicyIndexedSchema, PolicyEmbeddingCreatedSchema } from '../knowledge-base-events';

const baseEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  event_version: '1.0',
  timestamp: '2024-01-01T00:00:00.000Z',
  correlation_id: '550e8400-e29b-41d4-a716-446655440001',
  tenant_id: '550e8400-e29b-41d4-a716-446655440002',
  source: 'knowledge-base-service',
};

describe('PolicyIndexed event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyIndexed',
      payload: { policy_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(PolicyIndexedSchema.safeParse(event).success).toBe(true);
  });
});

describe('PolicyEmbeddingCreated event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyEmbeddingCreated',
      payload: { embedding_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(PolicyEmbeddingCreatedSchema.safeParse(event).success).toBe(true);
  });
});
