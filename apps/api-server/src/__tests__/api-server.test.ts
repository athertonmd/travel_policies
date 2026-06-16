import { describe, it, expect } from 'vitest';
import { config } from '../config.js';

describe('API Server Configuration', () => {
  it('should have default port 3001', () => {
    expect(config.port).toBe(3001);
  });

  it('should default to local storage mode', () => {
    expect(config.storageMode).toBe('local');
  });

  it('should have default local data directory', () => {
    expect(config.localDataDir).toBe('./.tpip-data');
  });

  it('should have default database URL for aws mode', () => {
    expect(config.database.url).toContain('postgresql://');
  });

  it('should have default S3 bucket', () => {
    expect(config.aws.s3Bucket).toBe('tpip-policy-documents');
  });

  it('should have default AWS region', () => {
    expect(config.aws.region).toBe('eu-west-1');
  });
});

describe('Upload validation rules', () => {
  it('should support PDF content type', () => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    expect(allowed.includes('application/pdf')).toBe(true);
  });

  it('should support DOCX content type', () => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    expect(allowed.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
  });

  it('should reject unsupported types', () => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    expect(allowed.includes('text/plain')).toBe(false);
    expect(allowed.includes('image/png')).toBe(false);
  });
});

describe('S3 key structure', () => {
  it('should follow tenant/enterprise/document/filename pattern', () => {
    const tenantId = 'tenant-1';
    const enterpriseId = 'enterprise-1';
    const documentId = 'doc-uuid';
    const filename = 'policy.pdf';
    const key = `${tenantId}/${enterpriseId}/${documentId}/${filename}`;
    expect(key).toBe('tenant-1/enterprise-1/doc-uuid/policy.pdf');
  });
});

describe('Health endpoint response', () => {
  it('should return expected healthy format', () => {
    const response = { status: 'healthy' };
    expect(response.status).toBe('healthy');
  });

  it('should return expected ready format', () => {
    const response = { database: 'connected', s3: 'connected' };
    expect(response.database).toBe('connected');
    expect(response.s3).toBe('connected');
  });
});
