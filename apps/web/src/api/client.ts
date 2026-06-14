/**
 * API client for consuming TPIP backend services.
 * All business logic remains server-side.
 */
const BASE_URL = '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || 'Request failed');
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  // Dashboard
  getDashboardSummary: () => request('/admin/dashboard/summary'),
  getDashboardEnterprises: (params?: string) => request(`/admin/dashboard/enterprises${params ? `?${params}` : ''}`),
  getDashboardActivity: (params?: string) => request(`/admin/dashboard/activity${params ? `?${params}` : ''}`),
  getDashboardExceptions: () => request('/admin/dashboard/exceptions'),

  // Enterprises
  getEnterprises: (tenantId: string) => request(`/tenants/${tenantId}/enterprises`),
  getEnterprise: (tenantId: string, id: string) => request(`/tenants/${tenantId}/enterprises/${id}`),

  // Documents
  getDocuments: (enterpriseId: string) => request(`/enterprises/${enterpriseId}/documents`),
  uploadDocument: (enterpriseId: string, body: FormData) =>
    fetch(`${BASE_URL}/enterprises/${enterpriseId}/documents`, { method: 'POST', body }),

  // Extraction
  getExtractedText: (enterpriseId: string, docId: string) =>
    request(`/enterprises/${enterpriseId}/documents/${docId}/text`),

  // Reviews
  getReviewItems: (enterpriseId: string, policyId: string) =>
    request(`/enterprises/${enterpriseId}/policies/${policyId}/review-items`),
  approveRule: (enterpriseId: string, policyId: string, ruleId: string) =>
    request(`/enterprises/${enterpriseId}/policies/${policyId}/rules/${ruleId}/approve`, { method: 'POST' }),
  modifyRule: (enterpriseId: string, policyId: string, ruleId: string, body: unknown) =>
    request(`/enterprises/${enterpriseId}/policies/${policyId}/rules/${ruleId}/modify`, { method: 'POST', body: JSON.stringify(body) }),
  rejectRule: (enterpriseId: string, policyId: string, ruleId: string, body: unknown) =>
    request(`/enterprises/${enterpriseId}/policies/${policyId}/rules/${ruleId}/reject`, { method: 'POST', body: JSON.stringify(body) }),

  // Policy
  getCurrentPolicy: (enterpriseId: string) => request(`/enterprises/${enterpriseId}/policy/current`),
  getPolicyVersion: (enterpriseId: string, version: number) => request(`/enterprises/${enterpriseId}/policy/version/${version}`),
  getPolicyVersions: (enterpriseId: string) => request(`/enterprises/${enterpriseId}/policy/versions`),
  getPolicyComparison: (enterpriseId: string, policyId: string) => request(`/enterprises/${enterpriseId}/policies/${policyId}/comparison`),
  exportPolicy: (enterpriseId: string) => request(`/enterprises/${enterpriseId}/policy/export`),

  // Knowledge Base
  searchKnowledgeBase: (enterpriseId: string, query: string) =>
    request(`/enterprises/${enterpriseId}/knowledge/search?query=${encodeURIComponent(query)}`),
};
