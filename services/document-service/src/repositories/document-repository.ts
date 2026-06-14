import { PolicyDocumentEntity } from '../domain/types';

/**
 * Document Repository Interface.
 */
export interface DocumentRepository {
  create(document: PolicyDocumentEntity): Promise<PolicyDocumentEntity>;
  findById(documentId: string): Promise<PolicyDocumentEntity | null>;
  findByEnterprise(enterpriseId: string): Promise<PolicyDocumentEntity[]>;
  findVersions(enterpriseId: string, documentId: string): Promise<PolicyDocumentEntity[]>;
  getLatestVersionNumber(enterpriseId: string): Promise<number>;
  update(document: PolicyDocumentEntity): Promise<PolicyDocumentEntity>;
}
