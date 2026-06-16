import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, ApiError } from '../lib/api-client';

/**
 * Policy Upload Page - supports PDF and DOCX via drag-and-drop or file picker.
 * Route: /enterprises/{enterpriseId}/upload
 * Uploads via multipart/form-data to the API server.
 */
export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ document_id: string; version_number: number; status: string } | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(f.type)) {
      setError('Only PDF and DOCX files are supported');
      return;
    }
    setError('');
    setFile(f);
    setResult(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      // TODO: Get enterpriseId from route params or context
      const enterpriseId = 'default';
      const data = await apiClient.uploadDocument(enterpriseId, file);
      setResult(data);
      setFile(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/enterprises" className="text-indigo-600 hover:text-indigo-800 text-sm">← Back to Enterprises</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Policy Document</h1>
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="region"
        aria-label="File upload area"
      >
        {file ? (
          <div>
            <p className="text-lg font-medium text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-lg text-gray-600">Drag and drop a PDF or DOCX file here</p>
            <p className="text-sm text-gray-400 mt-2">or</p>
            <label className="mt-4 inline-block cursor-pointer">
              <span className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">Choose File</span>
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-red-600 text-sm" role="alert">{error}</p>}

      {file && !result && (
        <button onClick={handleUpload} disabled={uploading} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      )}

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6" role="status">
          <p className="text-green-800 font-medium">Upload successful</p>
          <p className="text-sm text-green-600 mt-1">Document ID: {result.document_id}</p>
          <p className="text-sm text-green-600">Version: {result.version_number}</p>
          <p className="text-sm text-green-600">Status: {result.status}</p>
        </div>
      )}
    </div>
  );
}
