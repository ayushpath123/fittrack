import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCostClient } from "./AdminCostClient";
import { redirect } from "next/navigation";

const DAY_MS = 86_400_000;

async function loadEventCounts() {
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [counts7, counts30] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since7 } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
  ]);
  const by7 = new Map(counts7.map((r) => [r.name, r._count._all]));
  return counts30
    .map((r) => ({ name: r.name, last7: by7.get(r.name) ?? 0, last30: r._count._all }))
    .sort((a, b) => b.last30 - a.last30);
}

export default async function AdminPage() {
  try {
    await requireAdminUser();
  } catch {
    redirect("/dashboard");
  }

  const events = await loadEventCounts();

  return (
    <div className="space-y-4">
      <AdminCostClient />

      <div className="premium-card space-y-3 rounded-2xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
          Product events
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            No events recorded yet. Counts appear here as users sign up, log, share, and upgrade.
          </p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
              <span>Event</span>
              <span className="flex gap-6">
                <span className="w-14 text-right">7d</span>
                <span className="w-14 text-right">30d</span>
              </span>
            </div>
            {events.map((e) => (
              <div
                key={e.name}
                className="flex items-center justify-between border-t border-white/[0.06] py-1.5 text-sm text-gray-700 dark:text-slate-200"
              >
                <span className="font-medium">{e.name}</span>
                <span className="flex gap-6">
                  <span className="num w-14 text-right">{e.last7}</span>
                  <span className="num w-14 text-right text-gray-500 dark:text-slate-400">{e.last30}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
