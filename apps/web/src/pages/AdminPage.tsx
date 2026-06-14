export function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Administration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Tenant Summary</h2>
          <p className="text-sm text-gray-500">Loads from admin dashboard API</p>
        </section>
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">System Metrics</h2>
          <p className="text-sm text-gray-500">Loads from admin dashboard API</p>
        </section>
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Exception Summary</h2>
          <p className="text-sm text-gray-500">Loads from admin exceptions API</p>
        </section>
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h2>
          <p className="text-sm text-gray-500">Loads from admin activity API</p>
        </section>
      </div>
    </div>
  );
}
