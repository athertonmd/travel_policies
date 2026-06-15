import { RuleEvaluationResult } from './types';

/** Calculate compliance score: 100 - 10 per warning - 25 per violation. Min 0. */
export function calculateScore(results: RuleEvaluationResult[]): number {
  const warnings = results.filter((r) => r.outcome === 'Warning').length;
  const violations = results.filter((r) => r.outcome === 'Fail').length;
  return Math.max(0, 100 - (warnings * 10) - (violations * 25));
}
