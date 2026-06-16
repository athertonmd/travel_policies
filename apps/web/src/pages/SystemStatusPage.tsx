import { useState } from 'react';
import { apiClient } from '../lib/api-client';

/**
 * System status page for deployment verification.
 * Route: /system/status
 */
export function SystemStatusPage() {
  const [healthResult, setHealthResult] = useState<string>('');
  const [readyResult, setReadyResult] = useState<string>('');
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const health = await apiClient.health();
      setHealthResult(JSON.stringify(health, null, 2));
    } catch (err) {
      setHealthResult(`Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
    }
    try {
      const ready = await apiClient.ready();
      setReadyResult(JSON.stringify(ready, null, 2));
    } catch (err) {
      setReadyResult(`Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
    }
    setChecking(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Status</h1>
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">API Base URL</p>
          <p className="text-lg font-mono text-gray-800">{apiClient.getBaseUrl()}</p>
        </div>
        <button onClick={checkStatus} disabled={checking} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
          {checking ? 'Checking...' : 'Check Connectivity'}
        </button>
        {healthResult && (
          <div>
            <p className="text-sm font-medium text-gray-500 mt-4">GET /health</p>
            <pre className="bg-gray-100 rounded p-3 text-xs mt-1">{healthResult}</pre>
          </div>
        )}
        {readyResult && (
          <div>
            <p className="text-sm font-medium text-gray-500 mt-4">GET /ready</p>
            <pre className="bg-gray-100 rounded p-3 text-xs mt-1">{readyResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
