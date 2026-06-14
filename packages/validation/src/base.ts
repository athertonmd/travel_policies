import { z } from 'zod';

/** ISO 8601 UTC timestamp validation (BR-046) */
export const TimestampSchema = z.string().datetime('Must be a valid ISO 8601 UTC timestamp');

/** Non-empty string validation */
export const NonEmptyStringSchema = z.string().min(1, 'Must not be empty');

/** Email validation */
export const EmailSchema = z.string().email('Must be a valid email address');

/** Confidence score validation (0-100) */
export const ConfidenceScoreSchema = z
  .number()
  .min(0, 'Confidence must be at least 0')
  .max(100, 'Confidence must be at most 100');

/** Low confidence threshold (BR-017) */
export const LOW_CONFIDENCE_THRESHOLD = 80;

/** Checks if a confidence score is below the low confidence threshold (BR-017) */
export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}
