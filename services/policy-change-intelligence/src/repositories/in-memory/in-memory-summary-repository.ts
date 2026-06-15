import { SummaryRepository } from '../summary-repository';
import { ChangeSummary } from '../../domain/types';

export class InMemorySummaryRepository implements SummaryRepository {
  private store = new Map<string, ChangeSummary>();
  async save(summary: ChangeSummary): Promise<ChangeSummary> { this.store.set(summary.summary_id, { ...summary }); return { ...summary }; }
  async findByPolicy(policyId: string): Promise<ChangeSummary | null> {
    const found = Array.from(this.store.values()).find((s) => s.policy_id === policyId);
    return found ? { ...found } : null;
  }
  clear(): void { this.store.clear(); }
}
