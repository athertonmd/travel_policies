import { z } from 'zod';

/** UUID v4 validation schema */
export const UUIDSchema = z.string().uuid('Must be a valid UUID v4');

/** Validates a string is a valid UUID */
export function isValidUUID(value: string): boolean {
  return UUIDSchema.safeParse(value).success;
}

/** Parse and validate a UUID, throws on invalid */
export function parseUUID(value: string): string {
  return UUIDSchema.parse(value);
}
