import { z } from 'zod';

/**
 * Tenant and Enterprise validation schemas.
 */

export const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(255),
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['Active', 'Suspended', 'Archived']).optional(),
});

export const CreateEnterpriseSchema = z.object({
  name: z.string().min(1, 'Enterprise name is required').max(255),
  country: z.string().min(1, 'Country is required').max(100),
});

export const UpdateEnterpriseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  country: z.string().min(1).max(100).optional(),
  status: z.enum(['Active', 'Suspended', 'Archived']).optional(),
});
