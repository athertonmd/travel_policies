import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';

interface DocumentRecord {
  document_id: string;
  filename: string;
  version_number: number;
  status: string;
  uploaded_at: string;
  uploaded_by: string;
  file_size: number;
}

export function EnterprisesPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await apiClient.listDocuments('default') as DocumentRecord[];
      setDocuments(docs);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enterprises</h1>
        <Link
          to="/enterprises/default/upload"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Upload Policy
        </Link>
      </div>

      {error && <p className="text-red-600 text-sm mb-4" role="alert">{error}</p>}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Uploaded Documents</h2>
          <span className="text-sm text-gray-500">{documents.length} document(s)</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>No documents uploaded yet.</p>
            <Link to="/enterprises/default/upload" className="text-indigo-600 hover:text-indigo-800 text-sm mt-2 inline-block">Upload your first policy</Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.document_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.filename}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">v{doc.version_number}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${doc.status === 'Uploaded' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(doc.uploaded_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
