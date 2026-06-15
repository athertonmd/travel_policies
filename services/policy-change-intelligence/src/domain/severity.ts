import { ChangeSeverity, ChangeCategory, PolicyChangeInput } from './types';

/**
 * Calculate change severity based on rule type and magnitude of change.
 */
export function calculateSeverity(change: PolicyChangeInput): ChangeSeverity {
  // Removed or added entire rules are at least Moderate
  if (change.change_type === 'Removed') return 'Major';
  if (change.change_type === 'Added') return 'Moderate';

  // Threshold changes in cabin class / approval rules are Major
  const majorRules = ['AIR_007', 'AIR_008', 'AIR_009', 'HOTEL_001', 'GEN_001', 'GEN_002'];
  if (majorRules.includes(change.rule_type)) return 'Major';

  // Supplier preference changes are Minor
  const minorRules = ['AIR_011', 'AIR_012', 'HOTEL_004', 'HOTEL_005', 'RAIL_004', 'CAR_002'];
  if (minorRules.includes(change.rule_type)) return 'Minor';

  return 'Moderate';
}

/**
 * Map rule category to change category.
 */
export function mapToChangeCategory(category: string, ruleType: string): ChangeCategory {
  if (ruleType.startsWith('GEN_001') || ruleType.startsWith('GEN_002')) return 'Approval Policy';
  if (ruleType.startsWith('GEN_003') || ruleType.startsWith('GEN_004') || ruleType.startsWith('GEN_005')) return 'Traveller Classification';
  if (['AIR_011', 'AIR_012', 'HOTEL_004', 'HOTEL_005', 'RAIL_004', 'CAR_002'].includes(ruleType)) return 'Supplier Preferences';

  switch (category) {
    case 'Air': return 'Air Policy';
    case 'Hotel': return 'Hotel Policy';
    case 'Rail': return 'Rail Policy';
    case 'Car': return 'Car Policy';
    default: return 'General Policy';
  }
}
