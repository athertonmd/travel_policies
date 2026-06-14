export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="text-center py-12 text-gray-500" role="status">
      <p>{message}</p>
    </div>
  );
}
