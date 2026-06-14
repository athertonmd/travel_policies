export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
      <p className="text-red-700 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Retry
        </button>
      )}
    </div>
  );
}
