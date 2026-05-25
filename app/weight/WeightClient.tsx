"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WeightLogType } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { GamificationPanel } from "@/components/GamificationPanel";
import { InsightCallout } from "@/components/InsightCallout";
import { PrimaryActionBar } from "@/components/PrimaryActionBar";
import { ProgressSummaryCard } from "@/components/ProgressSummaryCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Toast } from "@/components/Toast";
import { WeightLineChart } from "@/components/WeightLineChart";

export function WeightClient({ initialLogs }: { initialLogs: WeightLogType[] }) {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState(initialLogs);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [input, setInput] = useState(logs[logs.length - 1]?.weight?.toString() ?? "");
  const [waistInput, setWaistInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [undoMessage, setUndoMessage] = useState("");
  const pendingDeleteRef = useRef<{ id: string; log: WeightLogType; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "log") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current.timer);
    };
  }, []);

  const filtered = range === "7d" ? logs.slice(-7) : logs;
  const weights = filtered.map((l) => l.weight);
  const min = weights.length ? Math.min(...weights) : 0;
  const max = weights.length ? Math.max(...weights) : 0;
  const change = weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0;
  const latestWeight = logs[logs.length - 1]?.weight ?? null;
  const latestWaist = logs[logs.length - 1]?.waistCm ?? null;
  const trendDirection = change < 0 ? "down" : change > 0 ? "up" : "flat";
  const trendLabel =
    weights.length > 1
      ? trendDirection === "down"
        ? "Moving down"
        : trendDirection === "up"
          ? "Moving up"
          : "Stable"
      : "Need more logs";

  async function logWeight() {
    const w = parseFloat(input);
    if (isNaN(w) || w <= 0) return;
    const date = new Date().toISOString().split("T")[0];
    const waist = parseFloat(waistInput);
    const body: { date: string; weight: number; waistCm?: number } = { date, weight: w };
    if (!Number.isNaN(waist) && waist > 0) body.waistCm = waist;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Unable to save weight");
      const saved = await res.json();
      setLogs((p) =>
        [...p.filter((x) => !String(x.date).startsWith(date)), saved].sort(
          (a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime(),
        ),
      );
      setWaistInput("");
    } catch {
      setError("Could not log weight. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function editLog(id: string, current: number, currentWaist?: number | null) {
    const next = window.prompt("Update weight (kg)", String(current));
    if (next === null) return;
    const weight = parseFloat(next);
    if (Number.isNaN(weight) || weight <= 0) return;
    const waistAns = window.prompt(
      "Waist (cm) — blank to leave unchanged, 0 to clear",
      currentWaist != null && currentWaist > 0 ? String(currentWaist) : "",
    );
    const patch: { weight: number; waistCm?: number | null } = { weight };
    if (waistAns !== null) {
      const t = waistAns.trim();
      if (t === "0") patch.waistCm = null;
      else if (t !== "") {
        const wc = parseFloat(t);
        if (!Number.isNaN(wc) && wc > 0) patch.waistCm = wc;
      }
    }
    const res = await fetch(`/api/weight/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!res.ok) return setError("Could not update weight.");
    const saved = await res.json();
    setLogs((prev) => prev.map((l) => (l.id === id ? saved : l)));
  }

  async function deleteLog(id: string) {
    const log = logs.find((l) => l.id === id);
    if (!log) return;
    if (pendingDeleteRef.current) {
      const prevPending = pendingDeleteRef.current;
      clearTimeout(prevPending.timer);
      const res = await fetch(`/api/weight/${prevPending.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        setLogs((prev) => [...prev, prevPending.log].sort((a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()));
      }
      pendingDeleteRef.current = null;
    }
    setLogs((p) => p.filter((l) => l.id !== id));
    setUndoMessage("Weight log deleted");
    const timer = setTimeout(async () => {
      const pending = pendingDeleteRef.current;
      if (!pending || pending.id !== id) return;
      const res = await fetch(`/api/weight/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        setLogs((prev) => [...prev, log].sort((a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()));
        setError("Could not delete weight log.");
      }
      pendingDeleteRef.current = null;
      setUndoMessage("");
    }, 5000);
    pendingDeleteRef.current = { id, log, timer };
  }

  function undoDeleteLog() {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    setLogs((prev) => [...prev, pending.log].sort((a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()));
    pendingDeleteRef.current = null;
    setUndoMessage("");
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Body metrics"
        title="Weight"
        subtitle="Log consistently and watch trend direction over daily noise."
        action={
          <Link
            href="/analytics"
            className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
          >
            Stats
          </Link>
        }
      />
      <GamificationPanel compact />
      <PrimaryActionBar
        title="Next best step"
        subtitle="Log under similar conditions each day for cleaner comparisons."
        action={
          <button
            disabled={isSaving}
            onClick={logWeight}
            className="rounded-xl bg-[#BEFF47] px-4 py-2 text-xs font-semibold text-[#06080A] min-h-10 disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Log now"}
          </button>
        }
      />
      <div className="premium-card card-entrance staggered rounded-2xl p-4" style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 2 }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Weight tracker</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {weights.length > 1 ? `Based on ${weights.length} logs in this range` : "Add more logs to unlock stronger trend insight"}
            </p>
          </div>
          <span className="rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
            {range === "7d" ? "7 days" : "30 days"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Current</p>
            <p className="mt-1 text-base font-bold text-[var(--white)]">{latestWeight != null ? `${latestWeight.toFixed(1)} kg` : "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Trend</p>
            <p className="mt-1 text-base font-bold text-[var(--white)]">
              {weights.length > 1 ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Waist</p>
            <p className="mt-1 text-base font-bold text-[var(--white)]">{latestWaist != null && latestWaist > 0 ? `${latestWaist.toFixed(1)} cm` : "—"}</p>
          </div>
        </div>
        <p className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--white)]">{trendLabel}.</span>{" "}
          {weights.length > 1
            ? "Use this with your nutrition and workout logs to understand what is driving changes."
            : "Log consistently on similar conditions (same time of day) for clearer trends."}
        </p>
      </div>
      <div className="premium-card card-entrance staggered rounded-2xl p-4" style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 1 }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Log today&apos;s weight</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="0.1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="metric-value flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-lg font-semibold text-[var(--white)] transition-all placeholder:text-[var(--hint)] focus:border-[#BEFF47]/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#BEFF47]/15"
            placeholder="72.5"
          />
          <span className="flex items-center font-medium text-[var(--muted)]">kg</span>
          <button
            disabled={isSaving}
            onClick={logWeight}
            className="rounded-xl bg-[#BEFF47] px-5 py-2.5 min-h-10 font-medium text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95 disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Log"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={waistInput}
            onChange={(e) => setWaistInput(e.target.value)}
            className="flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-[var(--white)] transition-all placeholder:text-[var(--hint)] focus:border-[#BEFF47]/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#BEFF47]/15"
            placeholder="Waist (cm), optional"
          />
        </div>
        <Toast message={error} type="error" />
        <Toast message={undoMessage} type="info" actionLabel="Undo" onAction={undoDeleteLog} />
      </div>

      <div className="grid grid-cols-2 gap-2 card-entrance staggered sm:grid-cols-4" style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 3 }}>
        <ProgressSummaryCard label="Current" value={`${weights[weights.length - 1] ?? "-"} kg`} />
        <ProgressSummaryCard label="Lowest" value={`${weights.length ? min.toFixed(1) : "-"} kg`} progressTone="blue" />
        <ProgressSummaryCard label="Highest" value={`${weights.length ? max.toFixed(1) : "-"} kg`} progressTone="amber" />
        <ProgressSummaryCard
          label="Change"
          value={`${weights.length ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}` : "-"} kg`}
          progressTone={change <= 0 ? "green" : "amber"}
        />
      </div>

      <div
        className="card-entrance staggered flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 4 }}
      >
        {(["7d", "30d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-[10px] py-1.5 text-sm font-medium transition-all ${
              range === r
                ? "bg-[#BEFF47] font-semibold text-[#06080A] shadow-[0_2px_12px_rgba(190,255,71,.2)]"
                : "text-[var(--muted)] hover:text-[#B8E86A]"
            }`}
          >
            {r === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      <div className="premium-card card-entrance staggered min-w-0 rounded-2xl p-4 dark:bg-slate-900/80" style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 5 }}>
        {filtered.length > 0 ? <WeightLineChart logs={filtered} /> : null}
      </div>

      <div className="premium-card card-entrance staggered overflow-hidden rounded-2xl" style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 6 }}>
        {[...filtered].reverse().map((l, i, arr) => {
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
                <div className="text-right">
                  <p className="font-semibold text-[var(--white)]">{l.weight} kg</p>
                  {l.waistCm != null && l.waistCm > 0 && <p className="text-[11px] text-[var(--hint)]">{l.waistCm} cm waist</p>}
                </div>
                <button onClick={() => editLog(l.id, l.weight, l.waistCm)} className="text-xs text-[#BEFF47]">
                  Edit
                </button>
                <button onClick={() => deleteLog(l.id)} className="text-xs text-red-500">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <InsightCallout
        title="Consistency beats perfection"
        body="A steady 7-day direction matters more than one-day spikes caused by hydration, stress, or sleep."
      />
      {!logs.length && <EmptyState title="No weight logs" subtitle="Log your weight to unlock trend insights." />}
    </div>
  );
}
