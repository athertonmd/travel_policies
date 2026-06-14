import { describe, it, expect } from 'vitest';
import { PolicyApprovedSchema, PolicyPublishedSchema } from '../publication-events';

const baseEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  event_version: '1.0',
  timestamp: '2024-01-01T00:00:00.000Z',
  correlation_id: '550e8400-e29b-41d4-a716-446655440001',
  tenant_id: '550e8400-e29b-41d4-a716-446655440002',
  source: 'review-service',
};

describe('PolicyApproved event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyApproved',
      payload: { policy_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(PolicyApprovedSchema.safeParse(event).success).toBe(true);
  });
});

describe('PolicyPublished event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyPublished',
      payload: {
        policy_id: '550e8400-e29b-41d4-a716-446655440010',
        version_number: 3,
      },
    };
    expect(PolicyPublishedSchema.safeParse(event).success).toBe(true);
  });

  it('should reject zero version_number', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyPublished',
      payload: {
        policy_id: '550e8400-e29b-41d4-a716-446655440010',
        version_number: 0,
      },
    };
    expect(PolicyPublishedSchema.safeParse(event).success).toBe(false);
  });
});
