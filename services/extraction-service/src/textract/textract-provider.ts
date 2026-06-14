import { TextractResult } from '../domain/types';

/**
 * Textract provider interface (ADR-004: Amazon Textract for OCR).
 * In production, integrates with AWS Textract APIs.
 */
export interface TextractProvider {
  /**
   * Extract text from a document stored in S3.
   * @param storageLocation S3 URI of the document
   * @param contentType MIME type of the document
   * @returns Extracted text organized by page
   * @throws ExtractionError on failure
   */
  extractText(storageLocation: string, contentType: string): Promise<TextractResult>;
}
