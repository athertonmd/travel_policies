/**
 * Policy Q&A Assistant page.
 * Allows users to ask natural language questions about enterprise travel policies.
 */
export function AssistantPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Policy Assistant</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question + Conversation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white shadow rounded-lg p-6 min-h-96">
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg">Ask a question about the travel policy</p>
              <p className="text-sm mt-2">Answers are based on the current published policy</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. Can managers fly business class to New York?"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
              aria-label="Policy question"
            />
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Ask
            </button>
          </div>
        </div>
        {/* Citations Panel */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Citations</h2>
          <p className="text-sm text-gray-500">Source references will appear here when a question is answered</p>
        </div>
      </div>
    </div>
  );
}
