import { Router, Request, Response } from 'express';
import { config } from '../config.js';

export function healthRoutes(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy' });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    if (config.storageMode === 'local') {
      res.json({ database: 'local-file', s3: 'local-file', mode: 'local' });
      return;
    }

    // AWS mode — check PostgreSQL
    let dbConnected = false;
    try {
      const { checkDatabaseConnection } = await import('../repositories/postgres/pg-client.js');
      dbConnected = await checkDatabaseConnection();
    } catch {
      dbConnected = false;
    }

    res.json({
      database: dbConnected ? 'connected' : 'disconnected',
      s3: 'connected',
      mode: 'aws',
    });
  });

  return router;
}
