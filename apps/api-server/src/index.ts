import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { uploadRoutes } from './routes/upload.js';
import { S3StorageProvider } from './storage/s3-storage-provider.js';
import { PgDocumentRepository } from './repositories/postgres/pg-document-repository.js';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Infrastructure
const s3Storage = new S3StorageProvider();
const documentRepo = new PgDocumentRepository();

// Routes
app.use(healthRoutes());
app.use(uploadRoutes(s3Storage, documentRepo));

// Start
app.listen(config.port, () => {
  console.log(`TPIP API Server running on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Database: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`S3 Bucket: ${config.aws.s3Bucket}`);
});

export { app };
