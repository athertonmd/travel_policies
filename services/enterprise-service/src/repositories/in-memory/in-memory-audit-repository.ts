import { AuditRepository } from '../audit-repository';
import { AuditEntry } from '../../domain/types';

/**
 * In-memory implementation of AuditRepository for testing.
 * Audit records are immutable (BR-044).
 */
export class InMemoryAuditRepository implements AuditRepository {
  private store: AuditEntry[] = [];

  async create(entry: AuditEntry): Promise<AuditEntry> {
    this.store.push({ ...entry });
    return { ...entry };
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]> {
    return this.store
      .filter((e) => e.entity_type === entityType && e.entity_id === entityId)
      .map((e) => ({ ...e }));
  }

  /** Test helper: get all entries */
  getAll(): AuditEntry[] {
    return [...this.store];
  }

  /** Test helper: clear all data */
  clear(): void {
    this.store = [];
  }
}
