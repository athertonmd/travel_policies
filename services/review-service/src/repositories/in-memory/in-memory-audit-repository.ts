import { AuditRepository } from '../audit-repository';
import { AuditEntry } from '../../domain/types';

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

  getAll(): AuditEntry[] { return [...this.store]; }
  clear(): void { this.store = []; }
}
