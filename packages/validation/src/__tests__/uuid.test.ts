import { describe, it, expect } from 'vitest';
import { isValidUUID, parseUUID } from '../uuid';

describe('UUID validation', () => {
  it('should accept a valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject an empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('should reject a non-UUID string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('should reject a UUID with wrong length', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('parseUUID should return the UUID for valid input', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(parseUUID(uuid)).toBe(uuid);
  });

  it('parseUUID should throw for invalid input', () => {
    expect(() => parseUUID('invalid')).toThrow();
  });
});
