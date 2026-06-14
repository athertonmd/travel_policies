export function EnterprisesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enterprises</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loads from enterprise APIs</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
