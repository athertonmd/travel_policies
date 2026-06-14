import { describe, it, expect } from 'vitest';
import { isValidTenantId, isValidEnterpriseId, TenantContextSchema } from '../tenant';

describe('Tenant ID validation', () => {
  it('should accept a valid tenant UUID', () => {
    expect(isValidTenantId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject an invalid tenant ID', () => {
    expect(isValidTenantId('invalid')).toBe(false);
  });
});

describe('Enterprise ID validation', () => {
  it('should accept a valid enterprise UUID', () => {
    expect(isValidEnterpriseId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject an invalid enterprise ID', () => {
    expect(isValidEnterpriseId('')).toBe(false);
  });
});

describe('TenantContext validation', () => {
  it('should accept valid context with tenant_id only', () => {
    const result = TenantContextSchema.safeParse({
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid context with both IDs', () => {
    const result = TenantContextSchema.safeParse({
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      enterprise_id: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject context with invalid tenant_id', () => {
    const result = TenantContextSchema.safeParse({ tenant_id: 'bad' });
    expect(result.success).toBe(false);
  });
});
