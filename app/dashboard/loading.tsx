export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-28 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
      </div>
      <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
      <div className="h-36 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
    </div>
  );
}
