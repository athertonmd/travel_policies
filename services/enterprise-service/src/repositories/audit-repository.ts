import { AuditEntry } from '../domain/types';

/**
 * Audit Repository Interface (BR-043, BR-044).
 * Audit records are immutable — no update or delete operations.
 */
export interface AuditRepository {
  create(entry: AuditEntry): Promise<AuditEntry>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}
