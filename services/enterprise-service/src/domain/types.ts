/**
 * Enterprise Service domain types.
 * Extends shared types with service-specific DTOs.
 */

import { EntityStatus } from '@tpip/shared-types';

/** Tenant status model per Project 2 requirements */
export type TenantStatus = EntityStatus; // 'Active' | 'Suspended' | 'Archived'

/** Enterprise status model per Project 2 requirements */
export type EnterpriseStatus = EntityStatus;

/** Tenant domain entity */
export interface TenantEntity {
  tenant_id: string;
  name: string;
  status: TenantStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Enterprise domain entity */
export interface EnterpriseEntity {
  enterprise_id: string;
  tenant_id: string;
  name: string;
  country: string;
  status: EnterpriseStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Create tenant request */
export interface CreateTenantRequest {
  name: string;
}

/** Update tenant request */
export interface UpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
}

/** Create enterprise request */
export interface CreateEnterpriseRequest {
  name: string;
  country: string;
}

/** Update enterprise request */
export interface UpdateEnterpriseRequest {
  name?: string;
  country?: string;
  status?: EnterpriseStatus;
}

/** Caller context for authorization (ADR-020, BR-038-042) */
export interface CallerContext {
  user_id: string;
  tenant_id: string;
  role: 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';
}

/** Audit log entry */
export interface AuditEntry {
  audit_id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
}
