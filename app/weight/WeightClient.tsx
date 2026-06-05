"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { WeightAnalyticsPanel } from "@/components/weight/WeightAnalyticsPanel";
import { WeightHistoryList } from "@/components/weight/WeightHistoryList";
import { WeightInsightsPanel } from "@/components/weight/WeightInsightsPanel";
import { WeightLogModal } from "@/components/weight/WeightLogModal";
import { WeightLineChart } from "@/components/WeightLineChart";
import {
  computeWeightAnalytics,
  trendStatusLabel,
  WEIGHT_UNIT,
} from "@/lib/weight-analytics";
import { deleteWeight, mergeWeightLog, removeWeightLog, replaceWeightLog, saveWeight, updateWeight } from "@/lib/weight-api";
import { WeightLogType } from "@/types";

export function WeightClient({ initialLogs }: { initialLogs: WeightLogType[] }) {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState(initialLogs);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "log") {
      setModalOpen(true);
    }
  }, [searchParams]);

  const analytics = computeWeightAnalytics(logs);
  const sliceCount = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const filtered = logs.slice(-sliceCount);
  const trendLabel = trendStatusLabel(analytics.trendStatus);
  const trendColor =
    analytics.trendStatus === "losing"
      ? "text-emerald-400"
      : analytics.trendStatus === "gaining"
        ? "text-amber-400"
        : "text-[var(--muted)]";

  async function handleSave(weight: number) {
    const saved = await saveWeight(weight);
    setLogs((prev) => mergeWeightLog(prev, saved));
    toast.success("Weight logged successfully");
  }

  async function handleUpdate(id: string, weight: number) {
    const updated = await updateWeight(id, weight);
    setLogs((prev) => replaceWeightLog(prev, updated));
    toast.success("Weight updated");
  }

  async function handleDelete(id: string) {
    await deleteWeight(id);
    setLogs((prev) => removeWeightLog(prev, id));
    toast.success("Entry deleted");
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Progress"
        title="Weight Tracker"
        subtitle="Track your weight and monitor long-term trends."
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#A78BFA] px-3 py-1.5 text-xs font-semibold text-[#06080A]"
          >
            Log Weight
          </button>
        }
      />

      {logs.length === 0 ? (
        <EmptyState
          title="No weight entries yet"
          subtitle="Track your first weight to start monitoring progress."
          actionLabel="Log Weight"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <>
          <div className="premium-card rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Current</p>
                <p className="mt-1 text-xl font-bold text-[var(--white)]">
                  {analytics.currentWeight?.toFixed(1)} {WEIGHT_UNIT}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">7-day avg</p>
                <p className="mt-1 text-xl font-bold text-[#C4B5FD]">
                  {analytics.avg7d?.toFixed(1) ?? "—"} {WEIGHT_UNIT}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">30-day avg</p>
                <p className="mt-1 text-lg font-semibold text-[var(--white)]">
                  {analytics.avg30d?.toFixed(1) ?? "—"} {WEIGHT_UNIT}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Difference</p>
                <p className={`mt-1 text-lg font-semibold ${trendColor}`}>
                  {analytics.monthlyChange != null
                    ? `${analytics.monthlyChange > 0 ? "+" : ""}${analytics.monthlyChange.toFixed(1)} ${WEIGHT_UNIT}`
                    : "—"}
                </p>
                {trendLabel ? <p className={`text-[11px] ${trendColor}`}>{trendLabel}</p> : null}
              </div>
            </div>
            {analytics.lastUpdatedLabel ? (
              <p className="mt-3 text-xs text-[var(--hint)]">{analytics.lastUpdatedLabel}</p>
            ) : null}
          </div>

          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`flex-1 rounded-[10px] py-1.5 text-sm font-medium transition-all ${
                  range === r ? "bg-[#A78BFA] font-semibold text-[#06080A]" : "text-[var(--muted)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="premium-card min-w-0 rounded-2xl p-4">
            {filtered.length > 0 ? (
              <WeightLineChart logs={filtered} />
            ) : (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Log weight to see your trend chart.</p>
            )}
          </div>

          <WeightAnalyticsPanel logs={logs} />
          <WeightInsightsPanel logs={logs} />
          <WeightHistoryList logs={logs} onUpdate={handleUpdate} onDelete={handleDelete} />
        </>
      )}

      <WeightLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialValue={logs[logs.length - 1]?.weight?.toString() ?? ""}
        onSave={handleSave}
      />
    </div>
  );
}
