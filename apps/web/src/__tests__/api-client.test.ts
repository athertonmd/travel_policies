import { describe, it, expect } from 'vitest';
import { apiClient } from '../lib/api-client';

describe('API Client', () => {
  it('should have a base URL configured', () => {
    const baseUrl = apiClient.getBaseUrl();
    expect(baseUrl).toBeDefined();
    expect(baseUrl.startsWith('http')).toBe(true);
  });

  it('should default to localhost:3001 when VITE_API_BASE_URL is not set', () => {
    // In test environment, import.meta.env.VITE_API_BASE_URL is undefined
    const baseUrl = apiClient.getBaseUrl();
    expect(baseUrl).toBe('http://localhost:3001');
  });

  it('should expose upload method', () => {
    expect(apiClient.uploadDocument).toBeTypeOf('function');
  });

  it('should expose health check methods', () => {
    expect(apiClient.health).toBeTypeOf('function');
    expect(apiClient.ready).toBeTypeOf('function');
  });

  it('should expose all API methods', () => {
    expect(apiClient.listDocuments).toBeTypeOf('function');
    expect(apiClient.getDashboardSummary).toBeTypeOf('function');
    expect(apiClient.getCurrentPolicy).toBeTypeOf('function');
    expect(apiClient.searchKnowledgeBase).toBeTypeOf('function');
    expect(apiClient.askQuestion).toBeTypeOf('function');
    expect(apiClient.evaluateCompliance).toBeTypeOf('function');
  });
});
