import { DocumentLookup } from '../document-lookup';
import { DocumentRef } from '../../domain/types';

/**
 * In-memory document lookup for testing.
 */
export class InMemoryDocumentLookup implements DocumentLookup {
  private store = new Map<string, DocumentRef>();

  addDocument(doc: DocumentRef): void {
    this.store.set(doc.document_id, { ...doc });
  }

  async findById(documentId: string): Promise<DocumentRef | null> {
    const doc = this.store.get(documentId);
    return doc ? { ...doc } : null;
  }

  async updateStatus(documentId: string, status: string): Promise<void> {
    const doc = this.store.get(documentId);
    if (doc) {
      this.store.set(documentId, { ...doc, status });
    }
  }

  clear(): void {
    this.store.clear();
  }
}
