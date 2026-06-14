import { TextractProvider } from './textract-provider';
import { TextractResult, TextractPage } from '../domain/types';
import { ExtractionError } from '../domain/errors';

/**
 * In-memory Textract provider for testing.
 * Simulates Amazon Textract behaviour without AWS dependencies.
 */
export class InMemoryTextractProvider implements TextractProvider {
  private results = new Map<string, TextractResult>();
  private failures = new Set<string>();

  /** Configure a successful extraction result for a storage location */
  setResult(storageLocation: string, pages: TextractPage[]): void {
    this.results.set(storageLocation, {
      pages,
      page_count: pages.length,
    });
  }

  /** Configure a failure for a storage location */
  setFailure(storageLocation: string): void {
    this.failures.add(storageLocation);
  }

  async extractText(storageLocation: string, _contentType: string): Promise<TextractResult> {
    if (this.failures.has(storageLocation)) {
      throw new ExtractionError(`Textract extraction failed for: ${storageLocation}`);
    }

    const result = this.results.get(storageLocation);
    if (!result) {
      // Default: return empty result for unknown documents
      return { pages: [], page_count: 0 };
    }

    return { ...result, pages: result.pages.map((p) => ({ ...p })) };
  }

  clear(): void {
    this.results.clear();
    this.failures.clear();
  }
}
