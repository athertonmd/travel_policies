/**
 * Side-by-side policy review screen (ADR-012).
 * LEFT: Source policy text, page reference, paragraph
 * RIGHT: Extracted rule, confidence, review actions
 */
export function ReviewDetailPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Policy Review</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Source */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Source Document</h2>
          <div className="text-sm text-gray-600">
            <p className="font-medium">Page: -</p>
            <p className="font-medium">Paragraph: -</p>
            <p className="mt-2 bg-yellow-50 p-3 rounded border border-yellow-200">Source text loads here</p>
          </div>
        </div>
        {/* Right Panel - Extracted Rule */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Extracted Rule</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">Rule Type:</span> <span className="font-medium">-</span></div>
            <div><span className="text-gray-500">Category:</span> <span className="font-medium">-</span></div>
            <div><span className="text-gray-500">Value:</span> <span className="font-medium">-</span></div>
            <div><span className="text-gray-500">Confidence:</span> <span className="font-medium">-</span></div>
          </div>
          <div className="mt-6 flex space-x-3">
            <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Approve</button>
            <button className="bg-amber-500 text-white px-4 py-2 rounded text-sm hover:bg-amber-600">Modify</button>
            <button className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}
