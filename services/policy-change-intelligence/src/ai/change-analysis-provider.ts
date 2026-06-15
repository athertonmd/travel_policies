import { PolicyChangeInput, ChangeSummary } from '../domain/types';

export interface PolicyChangeAnalysisProvider {
  generateSummary(
    enterpriseId: string,
    comparisonId: string,
    changes: PolicyChangeInput[],
  ): Promise<Omit<ChangeSummary, 'summary_id' | 'enterprise_id' | 'tenant_id' | 'comparison_id' | 'policy_id'>>;
}
