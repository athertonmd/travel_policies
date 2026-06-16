import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { uploadRoutes } from './routes/upload.js';
import { S3StorageProvider } from './storage/s3-storage-provider.js';
import { LocalStorageProvider } from './storage/local-storage-provider.js';
import { PgDocumentRepository } from './repositories/postgres/pg-document-repository.js';
import { LocalDocumentRepository } from './repositories/local/local-document-repository.js';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Infrastructure — switch between local and AWS modes
const storage = config.storageMode === 'local'
  ? new LocalStorageProvider()
  : new S3StorageProvider();

const documentRepo = config.storageMode === 'local'
  ? new LocalDocumentRepository()
  : new PgDocumentRepository();

// Routes
app.use(healthRoutes());
app.use(uploadRoutes(storage as S3StorageProvider | LocalStorageProvider, documentRepo as PgDocumentRepository | LocalDocumentRepository));

// Start
app.listen(config.port, () => {
  console.log(`TPIP API Server running on port ${config.port}`);
  console.log(`Storage mode: ${config.storageMode}`);
  if (config.storageMode === 'local') {
    console.log(`Local data: ${config.localDataDir}`);
    console.log('No Docker or PostgreSQL required');
  } else {
    console.log(`Database: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
    console.log(`S3 Bucket: ${config.aws.s3Bucket}`);
  }
});

export { app };
