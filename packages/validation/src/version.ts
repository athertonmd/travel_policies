import { z } from 'zod';

/** Version number validation (BR-012: sequential, positive integers) */
export const VersionNumberSchema = z
  .number()
  .int('Version must be an integer')
  .positive('Version must be positive');

/** Entity version for optimistic concurrency */
export const EntityVersionSchema = z
  .number()
  .int('Entity version must be an integer')
  .nonnegative('Entity version must be non-negative');

/** Validates a version number */
export function isValidVersionNumber(value: number): boolean {
  return VersionNumberSchema.safeParse(value).success;
}

/** Validates that a new version follows sequentially from the previous (BR-012) */
export function isSequentialVersion(currentVersion: number, newVersion: number): boolean {
  return newVersion === currentVersion + 1;
}
