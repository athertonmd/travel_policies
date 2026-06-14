export function PublishedPolicyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Published Policy</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">Version: -</p>
            <p className="text-sm text-gray-500">Published: -</p>
            <p className="text-sm text-gray-500">Approved By: -</p>
          </div>
          <div className="space-x-2">
            <button className="bg-indigo-600 text-white px-3 py-2 text-sm rounded hover:bg-indigo-700">Copy JSON</button>
            <button className="bg-gray-600 text-white px-3 py-2 text-sm rounded hover:bg-gray-700">Download</button>
          </div>
        </div>
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto max-h-96">
          {'{ "policy": "loads from API" }'}
        </pre>
      </div>
    </div>
  );
}
