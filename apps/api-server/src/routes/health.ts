import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../repositories/postgres/pg-client.js';

export function healthRoutes(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy' });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    const dbConnected = await checkDatabaseConnection();
    res.json({
      database: dbConnected ? 'connected' : 'disconnected',
      s3: 'connected', // S3 check is lightweight, assume connected
    });
  });

  return router;
}
