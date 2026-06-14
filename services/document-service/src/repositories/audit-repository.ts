import { AuditEntry } from '../domain/types';

/**
 * Audit Repository Interface (BR-043, BR-044).
 */
export interface AuditRepository {
  create(entry: AuditEntry): Promise<AuditEntry>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}
