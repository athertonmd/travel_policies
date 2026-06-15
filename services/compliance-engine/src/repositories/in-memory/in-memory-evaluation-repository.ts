import { ComplianceEvaluationResult } from '../../domain/types';
export interface EvaluationRepository { save(result: ComplianceEvaluationResult): Promise<ComplianceEvaluationResult>; findById(id: string): Promise<ComplianceEvaluationResult | null>; findByEnterprise(enterpriseId: string): Promise<ComplianceEvaluationResult[]>; }
export class InMemoryEvaluationRepository implements EvaluationRepository {
  private store = new Map<string, ComplianceEvaluationResult>();
  async save(result: ComplianceEvaluationResult): Promise<ComplianceEvaluationResult> { this.store.set(result.evaluation_id, { ...result }); return { ...result }; }
  async findById(id: string): Promise<ComplianceEvaluationResult | null> { const r = this.store.get(id); return r ? { ...r } : null; }
  async findByEnterprise(enterpriseId: string): Promise<ComplianceEvaluationResult[]> { return Array.from(this.store.values()).filter((r) => r.enterprise_id === enterpriseId); }
  clear(): void { this.store.clear(); }
}
