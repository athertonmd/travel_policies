/**
 * Base entity types for TPIP.
 * All entities follow the Data Model Specification.
 */

/** Audit fields present on all entities (BR-043, BR-046) */
export interface AuditFields {
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

/** Base entity with ID and audit fields */
export interface BaseEntity extends AuditFields {
  id: string; // UUID
}

/** Multi-tenant entity (ADR-020, BR-042) */
export interface TenantAwareEntity extends BaseEntity {
  tenant_id: string;
}

/** Versioned entity supporting optimistic concurrency (BR-006) */
export interface VersionedEntity extends BaseEntity {
  version: number;
}

/** Combined tenant-aware and versioned entity */
export interface TenantAwareVersionedEntity extends TenantAwareEntity {
  version: number;
}
