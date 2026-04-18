export default function LoginLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center animate-pulse">
      <div className="premium-card w-full max-w-sm space-y-3 rounded-2xl p-5">
        <div className="h-7 w-24 rounded-xl bg-gray-200 dark:bg-slate-700" />
        <div className="h-3 w-full max-w-[220px] bg-gray-200 dark:bg-slate-700 rounded-md" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl mt-1" />
      </div>
    </div>
  );
}
