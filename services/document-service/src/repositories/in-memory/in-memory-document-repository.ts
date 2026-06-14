import { DocumentRepository } from '../document-repository';
import { PolicyDocumentEntity } from '../../domain/types';

/**
 * In-memory implementation of DocumentRepository for testing.
 */
export class InMemoryDocumentRepository implements DocumentRepository {
  private store = new Map<string, PolicyDocumentEntity>();

  async create(document: PolicyDocumentEntity): Promise<PolicyDocumentEntity> {
    this.store.set(document.document_id, { ...document });
    return { ...document };
  }

  async findById(documentId: string): Promise<PolicyDocumentEntity | null> {
    const doc = this.store.get(documentId);
    return doc ? { ...doc } : null;
  }

  async findByEnterprise(enterpriseId: string): Promise<PolicyDocumentEntity[]> {
    return Array.from(this.store.values())
      .filter((d) => d.enterprise_id === enterpriseId)
      .map((d) => ({ ...d }));
  }

  async findVersions(enterpriseId: string, _documentId: string): Promise<PolicyDocumentEntity[]> {
    // In this model, each upload creates a new document_id per version for the enterprise
    return Array.from(this.store.values())
      .filter((d) => d.enterprise_id === enterpriseId)
      .sort((a, b) => a.version_number - b.version_number)
      .map((d) => ({ ...d }));
  }

  async getLatestVersionNumber(enterpriseId: string): Promise<number> {
    const docs = Array.from(this.store.values()).filter(
      (d) => d.enterprise_id === enterpriseId,
    );
    if (docs.length === 0) return 0;
    return Math.max(...docs.map((d) => d.version_number));
  }

  async update(document: PolicyDocumentEntity): Promise<PolicyDocumentEntity> {
    this.store.set(document.document_id, { ...document });
    return { ...document };
  }

  clear(): void {
    this.store.clear();
  }
}
