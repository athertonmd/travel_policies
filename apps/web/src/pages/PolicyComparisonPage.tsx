export function PolicyComparisonPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Policy Comparison</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <span className="text-sm font-medium text-gray-500">Previous Version</span>
          <span className="text-sm font-medium text-gray-500">Current Version</span>
        </div>
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="flex justify-between items-center">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Added</span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Removed</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Modified</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Comparison data loads from policy comparison API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
