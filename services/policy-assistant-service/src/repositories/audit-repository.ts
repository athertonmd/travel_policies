import { AuditEntry } from '../domain/types';

export interface AuditRepository {
  create(entry: AuditEntry): Promise<AuditEntry>;
  findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}
