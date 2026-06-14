import { ExtractedDocumentText } from '../domain/types';

/**
 * Repository for extracted document text.
 */
export interface ExtractedTextRepository {
  createBatch(pages: ExtractedDocumentText[]): Promise<ExtractedDocumentText[]>;
  findByDocument(documentId: string): Promise<ExtractedDocumentText[]>;
  findByDocumentAndPage(documentId: string, pageNumber: number): Promise<ExtractedDocumentText | null>;
}
