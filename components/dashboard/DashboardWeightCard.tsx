"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { WeightMiniChart } from "@/components/WeightMiniChart";
import type { WeightLogType } from "@/types";

type DashboardWeightCardProps = {
  logs: WeightLogType[];
  todayLogged: boolean;
};

export function DashboardWeightCard({ logs, todayLogged }: DashboardWeightCardProps) {
  const router = useRouter();
  const latest = logs[logs.length - 1];
  const [input, setInput] = useState(latest?.weight?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const trend =
    logs.length > 1 ? logs[logs.length - 1].weight - logs[0].weight : null;

  async function logWeight() {
    const w = parseFloat(input);
    if (Number.isNaN(w) || w <= 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0], weight: w }),
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      setError("Could not save weight");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Weight</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--white)]">
            {latest ? `${latest.weight.toFixed(1)} kg` : "Log daily"}
            {trend !== null && (
              <span className={`ml-1.5 text-xs font-medium ${trend <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {trend > 0 ? "+" : ""}
                {trend.toFixed(1)} (7d)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/weight"
          className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]"
        >
          Trends
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      {logs.length > 1 ? (
        <div className="mb-3 min-w-0">
          <WeightMiniChart data={logs} />
        </div>
      ) : null}

      {todayLogged ? (
        <p className="text-xs text-[var(--muted)]">Logged today · open Weight for history</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="kg"
            className="metric-value flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-[var(--white)] focus:border-[#BEFF47]/40 focus:outline-none"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void logWeight()}
            className="rounded-xl bg-[#BEFF47] px-4 py-2 text-xs font-semibold text-[#06080A] disabled:opacity-40"
          >
            {saving ? "…" : "Log"}
          </button>
        </div>
      )}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
