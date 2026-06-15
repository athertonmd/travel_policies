import { AuditEntry } from '../../domain/types';
export interface AuditRepository { create(entry: AuditEntry): Promise<AuditEntry>; findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>; }
export class InMemoryAuditRepository implements AuditRepository {
  private store: AuditEntry[] = [];
  async create(entry: AuditEntry): Promise<AuditEntry> { this.store.push({ ...entry }); return { ...entry }; }
  async findByEntity(entityType: string, entityId: string): Promise<AuditEntry[]> { return this.store.filter((e) => e.entity_type === entityType && e.entity_id === entityId); }
  clear(): void { this.store = []; }
}
