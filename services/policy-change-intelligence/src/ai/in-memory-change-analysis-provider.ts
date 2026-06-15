import { PolicyChangeAnalysisProvider } from './change-analysis-provider';
import { PolicyChangeInput, ChangeSummary, KeyChange } from '../domain/types';
import { calculateSeverity, mapToChangeCategory } from '../domain/severity';

export class InMemoryChangeAnalysisProvider implements PolicyChangeAnalysisProvider {
  async generateSummary(
    enterpriseId: string,
    comparisonId: string,
    changes: PolicyChangeInput[],
  ): Promise<Omit<ChangeSummary, 'summary_id' | 'enterprise_id' | 'tenant_id' | 'comparison_id' | 'policy_id'>> {
    if (changes.length === 0) {
      return {
        summary: 'No changes detected between policy versions.',
        key_changes: [],
        potential_impacts: [],
        risks: [],
        recommendations: [],
        generated_at: new Date().toISOString(),
        model_name: 'claude-sonnet-mock',
      };
    }

    const keyChanges: KeyChange[] = changes.map((c) => ({
      rule_type: c.rule_type,
      category: mapToChangeCategory(c.category, c.rule_type),
      description: `${c.rule_type}: ${c.change_type} — ${c.old_value ?? 'N/A'} → ${c.new_value ?? 'N/A'}`,
      severity: calculateSeverity(c),
      old_value: c.old_value,
      new_value: c.new_value,
    }));

    const majorChanges = keyChanges.filter((c) => c.severity === 'Major');
    const impacts = majorChanges.map((c) => `${c.category}: ${c.description} may significantly affect traveller behaviour`);
    const risks = majorChanges.length > 0 ? ['Major policy changes may require traveller communication'] : [];
    const recommendations = majorChanges.length > 0
      ? ['Review major changes with stakeholders before communicating to travellers']
      : ['No major action required'];

    return {
      summary: `Policy updated with ${changes.length} change(s): ${majorChanges.length} major, ${changes.length - majorChanges.length} minor/moderate.`,
      key_changes: keyChanges,
      potential_impacts: impacts,
      risks,
      recommendations,
      generated_at: new Date().toISOString(),
      model_name: 'claude-sonnet-mock',
    };
  }

  clear(): void { /* no state */ }
}
