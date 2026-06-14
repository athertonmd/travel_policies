import { Router, Request, Response } from 'express';
import { DocumentService } from '../services/document-service';
import { CallerContext } from '../domain/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

/**
 * Creates Express routes for document management.
 *
 * Endpoints:
 *   POST /api/v1/enterprises/:enterpriseId/documents
 *   GET  /api/v1/enterprises/:enterpriseId/documents
 *   GET  /api/v1/enterprises/:enterpriseId/documents/:documentId
 *   GET  /api/v1/enterprises/:enterpriseId/documents/:documentId/versions
 */
export function createDocumentRoutes(documentService: DocumentService): Router {
  const router = Router();

  function param(req: Request, name: string): string {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value || '';
  }

  router.post(
    '/api/v1/enterprises/:enterpriseId/documents',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await documentService.uploadDocument(
          param(req, 'enterpriseId'),
          {
            filename: req.body.filename,
            content_type: req.body.content_type,
            file_size: req.body.file_size,
            file_content: Buffer.from(req.body.file_content || '', 'base64'),
          },
          caller,
        );
        res.status(201).json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  router.get(
    '/api/v1/enterprises/:enterpriseId/documents',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await documentService.listDocuments(param(req, 'enterpriseId'), caller);
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  router.get(
    '/api/v1/enterprises/:enterpriseId/documents/:documentId',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await documentService.getDocument(
          param(req, 'enterpriseId'),
          param(req, 'documentId'),
          caller,
        );
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  router.get(
    '/api/v1/enterprises/:enterpriseId/documents/:documentId/versions',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await documentService.listVersions(
          param(req, 'enterpriseId'),
          param(req, 'documentId'),
          caller,
        );
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  return router;
}

function extractCaller(req: Request): CallerContext {
  const userId = req.headers['x-user-id'];
  const tenantId = req.headers['x-tenant-id'];
  const role = req.headers['x-user-role'];
  return {
    user_id: (Array.isArray(userId) ? userId[0] : userId) || 'anonymous',
    tenant_id: (Array.isArray(tenantId) ? tenantId[0] : tenantId) || '',
    role: ((Array.isArray(role) ? role[0] : role) as CallerContext['role']) || 'ReadOnly',
  };
}

function handleError(res: Response, err: unknown): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, details: err.details });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}
