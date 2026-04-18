export default function CalendarLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 dark:bg-slate-800 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
