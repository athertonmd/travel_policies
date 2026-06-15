import { ChangeSummary } from '../domain/types';

export interface SummaryRepository {
  save(summary: ChangeSummary): Promise<ChangeSummary>;
  findByPolicy(policyId: string): Promise<ChangeSummary | null>;
}
