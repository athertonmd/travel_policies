export function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Enterprises" value="-" />
        <SummaryCard title="Policies Awaiting Review" value="-" />
        <SummaryCard title="Policies Published" value="-" />
        <SummaryCard title="Low Confidence Rules" value="-" />
        <SummaryCard title="Extraction Failures" value="-" />
        <SummaryCard title="Active Enterprises" value="-" />
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <p className="text-gray-500 text-sm">Activity feed loads from /api/v1/admin/dashboard/activity</p>
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
