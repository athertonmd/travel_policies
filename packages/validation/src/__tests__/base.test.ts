import { describe, it, expect } from 'vitest';
import { TimestampSchema, ConfidenceScoreSchema, isLowConfidence, LOW_CONFIDENCE_THRESHOLD } from '../base';

describe('Timestamp validation (BR-046)', () => {
  it('should accept valid ISO 8601 timestamps', () => {
    expect(TimestampSchema.safeParse('2024-01-01T00:00:00.000Z').success).toBe(true);
    expect(TimestampSchema.safeParse('2024-06-15T14:30:00Z').success).toBe(true);
  });

  it('should reject invalid timestamps', () => {
    expect(TimestampSchema.safeParse('not-a-date').success).toBe(false);
    expect(TimestampSchema.safeParse('').success).toBe(false);
  });
});

describe('Confidence score validation', () => {
  it('should accept values between 0 and 100', () => {
    expect(ConfidenceScoreSchema.safeParse(0).success).toBe(true);
    expect(ConfidenceScoreSchema.safeParse(50).success).toBe(true);
    expect(ConfidenceScoreSchema.safeParse(100).success).toBe(true);
  });

  it('should reject values outside range', () => {
    expect(ConfidenceScoreSchema.safeParse(-1).success).toBe(false);
    expect(ConfidenceScoreSchema.safeParse(101).success).toBe(false);
  });
});

describe('Low confidence detection (BR-017)', () => {
  it('should identify scores below 80 as low confidence', () => {
    expect(isLowConfidence(79)).toBe(true);
    expect(isLowConfidence(50)).toBe(true);
    expect(isLowConfidence(0)).toBe(true);
  });

  it('should not flag scores at or above 80 as low', () => {
    expect(isLowConfidence(80)).toBe(false);
    expect(isLowConfidence(95)).toBe(false);
    expect(isLowConfidence(100)).toBe(false);
  });

  it('should use threshold of 80', () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(80);
  });
});
