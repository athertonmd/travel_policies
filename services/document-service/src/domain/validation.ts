import { z } from 'zod';

/** Maximum file size: 50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Supported MIME types */
export const SUPPORTED_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/** Upload document validation schema */
export const UploadDocumentSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(500),
  content_type: z.enum(SUPPORTED_CONTENT_TYPES, {
    errorMap: () => ({ message: 'Only PDF and DOCX files are supported' }),
  }),
  file_size: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE, `File size must not exceed ${MAX_FILE_SIZE} bytes`),
});

/** File extension validation */
export function isValidFileExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.docx');
}
