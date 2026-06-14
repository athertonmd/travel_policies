export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
      <div className="text-gray-500 text-sm">{message}</div>
    </div>
  );
}
