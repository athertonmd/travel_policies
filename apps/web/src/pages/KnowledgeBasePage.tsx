export function KnowledgeBasePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Knowledge Base</h1>
      <div className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search policy knowledge base..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            aria-label="Search query"
          />
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700">Search</button>
        </div>
      </div>
      <div className="space-y-4">
        <p className="text-gray-500 text-sm text-center py-8">Search results will appear here</p>
      </div>
    </div>
  );
}
