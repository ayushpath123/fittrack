export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="premium-card rounded-2xl p-6 text-center">
      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}
