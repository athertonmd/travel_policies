import { DocumentRef } from '../domain/types';

/**
 * Document lookup interface for cross-service reference.
 */
export interface DocumentLookup {
  findById(documentId: string): Promise<DocumentRef | null>;
  updateStatus(documentId: string, status: string): Promise<void>;
}
