import Link from "next/link";

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="premium-card rounded-2xl p-6 text-center">
      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
        >
          {actionLabel}
        </button>
      ) : actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-3 inline-flex rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
