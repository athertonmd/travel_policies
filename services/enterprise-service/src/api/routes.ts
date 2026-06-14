import { Router, Request, Response } from 'express';
import { TenantService } from '../services/tenant-service';
import { EnterpriseService } from '../services/enterprise-service';
import { CallerContext } from '../domain/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

/**
 * Creates Express routes for tenant and enterprise management.
 *
 * Endpoints:
 *   POST   /api/v1/tenants
 *   GET    /api/v1/tenants
 *   GET    /api/v1/tenants/:tenantId
 *   PATCH  /api/v1/tenants/:tenantId
 *   DELETE /api/v1/tenants/:tenantId  (archive, not hard delete)
 *
 *   POST   /api/v1/tenants/:tenantId/enterprises
 *   GET    /api/v1/tenants/:tenantId/enterprises
 *   GET    /api/v1/tenants/:tenantId/enterprises/:enterpriseId
 *   PATCH  /api/v1/tenants/:tenantId/enterprises/:enterpriseId
 *   DELETE /api/v1/tenants/:tenantId/enterprises/:enterpriseId  (archive)
 */
export function createRoutes(
  tenantService: TenantService,
  enterpriseService: EnterpriseService,
): Router {
  const router = Router();

  /** Extract a single string param safely */
  function param(req: Request, name: string): string {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value || '';
  }

  // --- Tenant endpoints ---

  router.post('/api/v1/tenants', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await tenantService.createTenant(req.body, caller);
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/api/v1/tenants', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await tenantService.listTenants(caller);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/api/v1/tenants/:tenantId', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await tenantService.getTenant(param(req, 'tenantId'), caller);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.patch('/api/v1/tenants/:tenantId', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await tenantService.updateTenant(param(req, 'tenantId'), req.body, caller);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.delete('/api/v1/tenants/:tenantId', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await tenantService.archiveTenant(param(req, 'tenantId'), caller);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  // --- Enterprise endpoints ---

  router.post('/api/v1/tenants/:tenantId/enterprises', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await enterpriseService.createEnterprise(param(req, 'tenantId'), req.body, caller);
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/api/v1/tenants/:tenantId/enterprises', async (req: Request, res: Response) => {
    try {
      const caller = extractCaller(req);
      const result = await enterpriseService.listEnterprises(param(req, 'tenantId'), caller);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get(
    '/api/v1/tenants/:tenantId/enterprises/:enterpriseId',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await enterpriseService.getEnterprise(
          param(req, 'tenantId'),
          param(req, 'enterpriseId'),
          caller,
        );
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  router.patch(
    '/api/v1/tenants/:tenantId/enterprises/:enterpriseId',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await enterpriseService.updateEnterprise(
          param(req, 'tenantId'),
          param(req, 'enterpriseId'),
          req.body,
          caller,
        );
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  router.delete(
    '/api/v1/tenants/:tenantId/enterprises/:enterpriseId',
    async (req: Request, res: Response) => {
      try {
        const caller = extractCaller(req);
        const result = await enterpriseService.archiveEnterprise(
          param(req, 'tenantId'),
          param(req, 'enterpriseId'),
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

/**
 * Extract caller context from request headers.
 * In production, this would come from Cognito JWT claims.
 */
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
