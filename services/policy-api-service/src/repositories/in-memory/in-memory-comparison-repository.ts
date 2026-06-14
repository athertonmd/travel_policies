import { ComparisonRepository } from '../comparison-repository';
import { PolicyComparisonEntity, PolicyChangeEntity } from '../../domain/types';

export class InMemoryComparisonRepository implements ComparisonRepository {
  private comparisons: PolicyComparisonEntity[] = [];
  private changes: PolicyChangeEntity[] = [];

  async createComparison(comparison: PolicyComparisonEntity): Promise<PolicyComparisonEntity> {
    this.comparisons.push({ ...comparison });
    return { ...comparison };
  }

  async createChanges(changes: PolicyChangeEntity[]): Promise<PolicyChangeEntity[]> {
    const copies = changes.map((c) => ({ ...c }));
    this.changes.push(...copies);
    return copies;
  }

  async findByComparison(comparisonId: string): Promise<PolicyChangeEntity[]> {
    return this.changes.filter((c) => c.comparison_id === comparisonId).map((c) => ({ ...c }));
  }

  async findComparisonByPolicy(enterpriseId: string, newVersion: number): Promise<PolicyComparisonEntity | null> {
    const found = this.comparisons.find(
      (c) => c.enterprise_id === enterpriseId && c.new_version === newVersion,
    );
    return found ? { ...found } : null;
  }

  clear(): void { this.comparisons = []; this.changes = []; }
}
