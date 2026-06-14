import { describe, it, expect } from 'vitest';
import {
  ReviewStartedSchema,
  RuleApprovedSchema,
  RuleModifiedSchema,
  ReviewCompletedSchema,
} from '../review-events';

const baseEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  event_version: '1.0',
  timestamp: '2024-01-01T00:00:00.000Z',
  correlation_id: '550e8400-e29b-41d4-a716-446655440001',
  tenant_id: '550e8400-e29b-41d4-a716-446655440002',
  source: 'review-service',
};

describe('ReviewStarted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'ReviewStarted',
      payload: {
        review_id: '550e8400-e29b-41d4-a716-446655440010',
        policy_id: '550e8400-e29b-41d4-a716-446655440020',
      },
    };
    expect(ReviewStartedSchema.safeParse(event).success).toBe(true);
  });
});

describe('RuleApproved event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'RuleApproved',
      payload: { rule_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(RuleApprovedSchema.safeParse(event).success).toBe(true);
  });
});

describe('RuleModified event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'RuleModified',
      payload: {
        rule_id: '550e8400-e29b-41d4-a716-446655440010',
        old_value: 'Economy only',
        new_value: 'Economy or Premium Economy',
      },
    };
    expect(RuleModifiedSchema.safeParse(event).success).toBe(true);
  });
});

describe('ReviewCompleted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'ReviewCompleted',
      payload: { review_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(ReviewCompletedSchema.safeParse(event).success).toBe(true);
  });
});
