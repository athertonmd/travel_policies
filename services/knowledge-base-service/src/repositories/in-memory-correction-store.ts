import { CorrectionStore } from '../services/knowledge-base-service';
import { CorrectionContext } from '../domain/types';

export class InMemoryCorrectionStore implements CorrectionStore {
  private store: (CorrectionContext & { enterprise_id: string })[] = [];

  addCorrection(enterpriseId: string, correction: CorrectionContext): void {
    this.store.push({ ...correction, enterprise_id: enterpriseId });
  }

  async findByEnterprise(enterpriseId: string): Promise<CorrectionContext[]> {
    return this.store.filter((c) => c.enterprise_id === enterpriseId).map(({ enterprise_id: _e, ...rest }) => rest);
  }

  async findByRuleType(enterpriseId: string, ruleType: string): Promise<CorrectionContext[]> {
    return this.store
      .filter((c) => c.enterprise_id === enterpriseId && c.rule_type === ruleType)
      .map(({ enterprise_id: _e, ...rest }) => rest);
  }

  clear(): void { this.store = []; }
}
