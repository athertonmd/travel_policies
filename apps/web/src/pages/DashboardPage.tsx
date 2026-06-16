import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

interface DocumentRecord {
  document_id: string;
  filename: string;
  status: string;
  uploaded_at: string;
}

export function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listDocuments('default')
      .then((docs) => setDocuments(docs as DocumentRecord[]))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  const uploaded = documents.filter((d) => d.status === 'Uploaded').length;
  const processing = documents.filter((d) => d.status === 'Processing').length;
  const published = documents.filter((d) => d.status === 'Published').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Documents" value={loading ? '...' : String(documents.length)} />
        <SummaryCard title="Awaiting Processing" value={loading ? '...' : String(uploaded)} />
        <SummaryCard title="Processing" value={loading ? '...' : String(processing)} />
        <SummaryCard title="Published" value={loading ? '...' : String(published)} />
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Uploads</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {documents.slice(0, 5).map((doc) => (
              <div key={doc.document_id} className="px-6 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{doc.filename}</p>
                  <p className="text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleString()}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${doc.status === 'Uploaded' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
