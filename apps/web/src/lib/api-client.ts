/**
 * Central API client for TPIP web application.
 * Uses VITE_API_BASE_URL environment variable for all requests.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Make a JSON API request.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...((body && !(body instanceof FormData)) ? { 'Content-Type': 'application/json' } : {}),
    // Placeholder for future Cognito token
    // 'Authorization': `Bearer ${getToken()}`,
    ...(customHeaders as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    body: body instanceof FormData ? body as unknown as BodyInit : body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, errorBody.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Upload a file via multipart/form-data.
 */
async function uploadFile<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    // No Content-Type header — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, errorBody.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export const apiClient = {
  getBaseUrl: () => API_BASE_URL,

  // Health
  health: () => request<{ status: string }>('/health'),
  ready: () => request<{ database: string; s3: string }>('/ready'),

  // Documents
  uploadDocument: (enterpriseId: string, file: File) =>
    uploadFile<{ document_id: string; version_number: number; status: string }>(`/api/v1/enterprises/${enterpriseId}/documents`, file),
  listDocuments: (enterpriseId: string) =>
    request(`/api/v1/enterprises/${enterpriseId}/documents`),

  // Dashboard
  getDashboardSummary: () => request('/api/v1/admin/dashboard/summary'),
  getDashboardActivity: () => request('/api/v1/admin/dashboard/activity'),

  // Enterprises
  getEnterprises: (tenantId: string) => request(`/api/v1/tenants/${tenantId}/enterprises`),

  // Policy
  getCurrentPolicy: (enterpriseId: string) => request(`/api/v1/enterprises/${enterpriseId}/policy/current`),
  exportPolicy: (enterpriseId: string) => request(`/api/v1/enterprises/${enterpriseId}/policy/export`),

  // Knowledge Base
  searchKnowledgeBase: (enterpriseId: string, query: string) =>
    request(`/api/v1/enterprises/${enterpriseId}/knowledge/search?query=${encodeURIComponent(query)}`),

  // Assistant
  askQuestion: (enterpriseId: string, question: string) =>
    request(`/api/v1/enterprises/${enterpriseId}/assistant/question`, { method: 'POST', body: { question } }),

  // Compliance
  evaluateCompliance: (enterpriseId: string, booking: unknown) =>
    request(`/api/v1/enterprises/${enterpriseId}/compliance/evaluate`, { method: 'POST', body: { booking } }),
};
