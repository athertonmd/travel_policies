import { ExtractedTextRepository } from '../extracted-text-repository';
import { ExtractedDocumentText } from '../../domain/types';

/**
 * In-memory implementation of ExtractedTextRepository for testing.
 */
export class InMemoryExtractedTextRepository implements ExtractedTextRepository {
  private store: ExtractedDocumentText[] = [];

  async createBatch(pages: ExtractedDocumentText[]): Promise<ExtractedDocumentText[]> {
    const copies = pages.map((p) => ({ ...p }));
    this.store.push(...copies);
    return copies;
  }

  async findByDocument(documentId: string): Promise<ExtractedDocumentText[]> {
    return this.store
      .filter((p) => p.document_id === documentId)
      .sort((a, b) => a.page_number - b.page_number)
      .map((p) => ({ ...p }));
  }

  async findByDocumentAndPage(
    documentId: string,
    pageNumber: number,
  ): Promise<ExtractedDocumentText | null> {
    const found = this.store.find(
      (p) => p.document_id === documentId && p.page_number === pageNumber,
    );
    return found ? { ...found } : null;
  }

  clear(): void {
    this.store = [];
  }
}
