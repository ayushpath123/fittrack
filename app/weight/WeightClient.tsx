"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WeightLogType } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { Toast } from "@/components/Toast";
import { WeightLineChart } from "@/components/WeightLineChart";

export function WeightClient({ initialLogs }: { initialLogs: WeightLogType[] }) {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState(initialLogs);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [input, setInput] = useState(logs[logs.length - 1]?.weight?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("action") === "log") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  const sliceCount = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const filtered = logs.slice(-sliceCount);
  const weights = filtered.map((l) => l.weight);
  const change = weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0;
  const latestWeight = logs[logs.length - 1]?.weight ?? null;
  const todayKey = new Date().toISOString().split("T")[0];
  const loggedToday = logs.some((l) => String(l.date).startsWith(todayKey));

  async function logWeight() {
    const w = parseFloat(input);
    if (isNaN(w) || w <= 0) return;
    const date = todayKey;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date, weight: w }),
      });
      if (!res.ok) throw new Error("Unable to save weight");
      const saved = await res.json();
      setLogs((p) =>
        [...p.filter((x) => !String(x.date).startsWith(date)), saved].sort(
          (a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime(),
        ),
      );
    } catch {
      setError("Could not log weight. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Body metrics"
        title="Weight"
        subtitle="Log once per day — trends smooth out daily noise."
        action={
          <Link
            href="/analytics"
            className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
          >
            Stats
          </Link>
        }
      />

      <div className="premium-card rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Today</p>
            <p className="mt-1 text-2xl font-bold text-[var(--white)]">
              {latestWeight != null ? `${latestWeight.toFixed(1)} kg` : "—"}
            </p>
            {loggedToday ? (
              <p className="mt-0.5 text-xs text-emerald-400">Logged today</p>
            ) : (
              <p className="mt-0.5 text-xs text-[var(--hint)]">Not logged yet</p>
            )}
          </div>
          {weights.length > 1 ? (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Trend</p>
              <p className={`text-lg font-bold ${change <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {change > 0 ? "+" : ""}
                {change.toFixed(1)} kg
              </p>
              <p className="text-[10px] text-[var(--hint)]">{range} window</p>
            </div>
          ) : null}
        </div>

        {!loggedToday ? (
          <div className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="metric-value flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-lg font-semibold text-[var(--white)] focus:border-[#BEFF47]/40 focus:outline-none"
              placeholder="72.5"
            />
            <span className="flex items-center font-medium text-[var(--muted)]">kg</span>
            <button
              disabled={isSaving}
              onClick={logWeight}
              className="rounded-xl bg-[#BEFF47] px-5 py-2.5 font-semibold text-[#06080A] disabled:opacity-40"
            >
              {isSaving ? "…" : "Log"}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="metric-value flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-[var(--white)] focus:outline-none"
              placeholder="Update weight"
            />
            <button
              disabled={isSaving}
              onClick={logWeight}
              className="rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-4 py-2 text-xs font-semibold text-[#B8E86A] disabled:opacity-40"
            >
              Update
            </button>
          </div>
        )}
        <Toast message={error} type="error" />
      </div>

      <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
        {(["7d", "30d", "90d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-[10px] py-1.5 text-sm font-medium transition-all ${
              range === r ? "bg-[#BEFF47] font-semibold text-[#06080A]" : "text-[var(--muted)]"
            }`}
          >
            {r === "7d" ? "7d" : r === "30d" ? "30d" : "90d"}
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

      <div className="premium-card overflow-hidden rounded-2xl">
        {[...filtered].reverse().slice(0, 14).map((l, i, arr) => {
          const prev = arr[i + 1];
          const diff = prev ? l.weight - prev.weight : null;
          return (
            <div key={l.id} className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 last:border-0">
              <p className="text-sm text-[var(--muted)]">
                {new Date(l.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <div className="flex items-center gap-2">
                {diff !== null && (
                  <span className={`text-xs ${diff > 0 ? "text-red-400" : "text-green-500"}`}>
                    {diff > 0 ? "+" : ""}
                    {diff.toFixed(1)}
                  </span>
                )}
                <p className="font-semibold text-[var(--white)]">{l.weight} kg</p>
              </div>
            </div>
          );
        })}
      </div>

      {!logs.length && <EmptyState title="No weight logs" subtitle="Log your weight daily to unlock trend insights." />}
    </div>
  );
}
