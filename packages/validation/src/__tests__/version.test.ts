import { describe, it, expect } from 'vitest';
import { isValidVersionNumber, isSequentialVersion } from '../version';

describe('Version number validation', () => {
  it('should accept positive integers', () => {
    expect(isValidVersionNumber(1)).toBe(true);
    expect(isValidVersionNumber(42)).toBe(true);
  });

  it('should reject zero', () => {
    expect(isValidVersionNumber(0)).toBe(false);
  });

  it('should reject negative numbers', () => {
    expect(isValidVersionNumber(-1)).toBe(false);
  });

  it('should reject decimals', () => {
    expect(isValidVersionNumber(1.5)).toBe(false);
  });
});

describe('Sequential version validation (BR-012)', () => {
  it('should accept sequential versions', () => {
    expect(isSequentialVersion(1, 2)).toBe(true);
    expect(isSequentialVersion(5, 6)).toBe(true);
  });

  it('should reject non-sequential versions', () => {
    expect(isSequentialVersion(1, 3)).toBe(false);
    expect(isSequentialVersion(5, 4)).toBe(false);
    expect(isSequentialVersion(1, 1)).toBe(false);
  });
});
