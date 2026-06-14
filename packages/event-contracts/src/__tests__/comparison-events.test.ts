import { describe, it, expect } from 'vitest';
import {
  PolicyComparisonStartedSchema,
  PolicyDifferenceDetectedSchema,
  PolicyComparisonCompletedSchema,
} from '../comparison-events';

const baseEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  event_version: '1.0',
  timestamp: '2024-01-01T00:00:00.000Z',
  correlation_id: '550e8400-e29b-41d4-a716-446655440001',
  tenant_id: '550e8400-e29b-41d4-a716-446655440002',
  source: 'comparison-service',
};

describe('PolicyComparisonStarted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyComparisonStarted',
      payload: {
        enterprise_id: '550e8400-e29b-41d4-a716-446655440010',
        old_version: 1,
        new_version: 2,
      },
    };
    expect(PolicyComparisonStartedSchema.safeParse(event).success).toBe(true);
  });
});

describe('PolicyDifferenceDetected event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyDifferenceDetected',
      payload: {
        change_id: '550e8400-e29b-41d4-a716-446655440010',
        rule_type: 'cabin_class',
      },
    };
    expect(PolicyDifferenceDetectedSchema.safeParse(event).success).toBe(true);
  });
});

describe('PolicyComparisonCompleted event contract', () => {
  it('should validate a valid event', () => {
    const event = {
      ...baseEvent,
      event_type: 'PolicyComparisonCompleted',
      payload: { comparison_id: '550e8400-e29b-41d4-a716-446655440010' },
    };
    expect(PolicyComparisonCompletedSchema.safeParse(event).success).toBe(true);
  });
});
