import { ApprovedPolicyEntity } from '../domain/types';

export interface ApprovedPolicyRepository {
  create(policy: ApprovedPolicyEntity): Promise<ApprovedPolicyEntity>;
  findById(policyId: string): Promise<ApprovedPolicyEntity | null>;
  findCurrentByEnterprise(enterpriseId: string): Promise<ApprovedPolicyEntity | null>;
  findByEnterpriseAndVersion(enterpriseId: string, version: number): Promise<ApprovedPolicyEntity | null>;
  update(policy: ApprovedPolicyEntity): Promise<ApprovedPolicyEntity>;
}
