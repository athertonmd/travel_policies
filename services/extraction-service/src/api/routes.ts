import { Router, Request, Response } from 'express';
import { DocumentProcessingService } from '../services/document-processing-service';
import { PolicyExtractionService } from '../services/policy-extraction-service';
import { CallerContext } from '../domain/types';
import { NotFoundError, ForbiddenError, ExtractionError } from '../domain/errors';

/**
 * Creates Express routes for extraction service (internal APIs).
 *
 * OCR Endpoints (Project 4):
 *   GET  /api/v1/enterprises/:enterpriseId/documents/:documentId/text
 *   GET  /api/v1/enterprises/:enterpriseId/documents/:documentId/pages
 *
 * AI Extraction Endpoints (Project 5):
 *   POST /api/v1/enterprises/:enterpriseId/documents/:documentId/extract-policy
 *   GET  /api/v1/enterprises/:enterpriseId/documents/:documentId/extracted-policy
 *   GET  /api/v1/enterprises/:enterpriseId/policies/:policyId/rules
 */
export function createExtractionRoutes(
  processingService: DocumentProcessingService,
  policyExtractionService?: PolicyExtractionService,
): Router {
  const router = Router();

  function param(req: Request, name: string): string {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value || '';
  }

  // --- OCR Endpoints (Project 4) ---

  router.get(
    '/api/v1/enterprises/:enterpriseId/documents/:documentId/text',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await processingService.getExtractedText(
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
    '/api/v1/enterprises/:enterpriseId/documents/:documentId/pages',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await processingService.getPages(
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

  // --- AI Extraction Endpoints (Project 5) ---

  if (policyExtractionService) {
    router.post(
      '/api/v1/enterprises/:enterpriseId/documents/:documentId/extract-policy',
      async (req: Request, res: Response) => {
        try {
          const caller = extractCaller(req);
          const result = await policyExtractionService.extractPolicy(
            param(req, 'enterpriseId'),
            param(req, 'documentId'),
            caller,
          );
          res.status(201).json({
            policy_id: result.policy.policy_id,
            rules_count: result.rules.length,
            overall_confidence: result.policy.overall_confidence,
          });
        } catch (err) {
          handleError(res, err);
        }
      },
    );

    router.get(
      '/api/v1/enterprises/:enterpriseId/documents/:documentId/extracted-policy',
      async (req: Request, res: Response) => {
        try {
          const caller = extractCaller(req);
          const result = await policyExtractionService.getExtractedPolicy(
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
      '/api/v1/enterprises/:enterpriseId/policies/:policyId/rules',
      async (req: Request, res: Response) => {
        try {
          const caller = extractCaller(req);
          const result = await policyExtractionService.getPolicyRules(
            param(req, 'enterpriseId'),
            param(req, 'policyId'),
            caller,
          );
          res.json(result);
        } catch (err) {
          handleError(res, err);
        }
      },
    );
  }

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
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
  } else if (err instanceof ExtractionError) {
    res.status(500).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}
