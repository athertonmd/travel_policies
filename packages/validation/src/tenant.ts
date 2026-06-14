import { z } from 'zod';
import { UUIDSchema } from './uuid';

/** Tenant ID validation schema (BR-004: globally unique) */
export const TenantIdSchema = UUIDSchema.describe('Tenant identifier');

/** Enterprise ID validation schema (BR-003: globally unique) */
export const EnterpriseIdSchema = UUIDSchema.describe('Enterprise identifier');

/** Validates a tenant ID */
export function isValidTenantId(value: string): boolean {
  return TenantIdSchema.safeParse(value).success;
}

/** Validates an enterprise ID */
export function isValidEnterpriseId(value: string): boolean {
  return EnterpriseIdSchema.safeParse(value).success;
}

/** Tenant context for multi-tenant operations (ADR-020) */
export const TenantContextSchema = z.object({
  tenant_id: TenantIdSchema,
  enterprise_id: EnterpriseIdSchema.optional(),
});

export type TenantContext = z.infer<typeof TenantContextSchema>;
