import { PolicyComparisonEntity, PolicyChangeEntity } from '../domain/types';

export interface ComparisonRepository {
  createComparison(comparison: PolicyComparisonEntity): Promise<PolicyComparisonEntity>;
  createChanges(changes: PolicyChangeEntity[]): Promise<PolicyChangeEntity[]>;
  findByComparison(comparisonId: string): Promise<PolicyChangeEntity[]>;
  findComparisonByPolicy(enterpriseId: string, newVersion: number): Promise<PolicyComparisonEntity | null>;
}
