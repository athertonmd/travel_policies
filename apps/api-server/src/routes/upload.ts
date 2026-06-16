import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

/** Common storage interface */
interface StorageProvider {
  upload(key: string, content: Buffer, contentType: string): Promise<{ storage_location: string; checksum: string }>;
}

/** Common document repository interface */
interface DocumentRepository {
  create(doc: DocumentRecord): Promise<DocumentRecord>;
  findByEnterprise(enterpriseId: string): Promise<DocumentRecord[]>;
  getLatestVersionNumber(enterpriseId: string): Promise<number>;
}

interface DocumentRecord {
  document_id: string;
  tenant_id: string;
  enterprise_id: string;
  version_number: number;
  filename: string;
  content_type: string;
  file_size: number;
  storage_location: string;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  checksum: string;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are supported'));
    }
  },
});

export function uploadRoutes(storage: StorageProvider, documentRepo: DocumentRepository): Router {
  const router = Router();

  router.post(
    '/api/v1/enterprises/:enterpriseId/documents',
    upload.single('file'),
    async (req: Request, res: Response) => {
      try {
        const enterpriseId = Array.isArray(req.params.enterpriseId) ? req.params.enterpriseId[0] : req.params.enterpriseId || '';
        const tenantId = Array.isArray(req.headers['x-tenant-id']) ? req.headers['x-tenant-id'][0] : (req.headers['x-tenant-id'] as string) || 'default-tenant';
        const userId = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : (req.headers['x-user-id'] as string) || 'anonymous';
        const file = req.file;

        if (!file) {
          res.status(400).json({ error: 'No file provided' });
          return;
        }

        const latestVersion = await documentRepo.getLatestVersionNumber(enterpriseId);
        const versionNumber = latestVersion + 1;

        const documentId = randomUUID();
        const s3Key = `${tenantId}/${enterpriseId}/${documentId}/${file.originalname}`;
        const checksum = createHash('sha256').update(file.buffer).digest('hex');

        const storageResult = await storage.upload(s3Key, file.buffer, file.mimetype);

        const now = new Date().toISOString();
        const doc = await documentRepo.create({
          document_id: documentId,
          tenant_id: tenantId,
          enterprise_id: enterpriseId,
          version_number: versionNumber,
          filename: file.originalname,
          content_type: file.mimetype,
          file_size: file.size,
          storage_location: storageResult.storage_location,
          uploaded_by: userId,
          uploaded_at: now,
          status: 'Uploaded',
          checksum,
        });

        res.status(201).json({
          document_id: doc.document_id,
          version_number: versionNumber,
          status: 'Uploaded',
          filename: file.originalname,
          file_size: file.size,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(500).json({ error: message });
      }
    },
  );

  router.get('/api/v1/enterprises/:enterpriseId/documents', async (req: Request, res: Response) => {
    try {
      const eid = Array.isArray(req.params.enterpriseId) ? req.params.enterpriseId[0] : req.params.enterpriseId || '';
      const documents = await documentRepo.findByEnterprise(eid);
      res.json(documents);
    } catch {
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  return router;
}
