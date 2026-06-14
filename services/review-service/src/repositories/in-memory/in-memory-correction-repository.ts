import { CorrectionRepository } from '../correction-repository';
import { RuleCorrectionEntity } from '../../domain/types';

export class InMemoryCorrectionRepository implements CorrectionRepository {
  private store: RuleCorrectionEntity[] = [];

  async create(correction: RuleCorrectionEntity): Promise<RuleCorrectionEntity> {
    this.store.push({ ...correction });
    return { ...correction };
  }

  async findByRule(ruleId: string): Promise<RuleCorrectionEntity[]> {
    return this.store.filter((c) => c.rule_id === ruleId).map((c) => ({ ...c }));
  }

  getAll(): RuleCorrectionEntity[] { return [...this.store]; }
  clear(): void { this.store = []; }
}
