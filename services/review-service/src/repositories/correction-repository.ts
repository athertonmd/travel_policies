import { RuleCorrectionEntity } from '../domain/types';

export interface CorrectionRepository {
  create(correction: RuleCorrectionEntity): Promise<RuleCorrectionEntity>;
  findByRule(ruleId: string): Promise<RuleCorrectionEntity[]>;
}
