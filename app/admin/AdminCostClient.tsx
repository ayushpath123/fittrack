"use client";

import { useMemo, useState } from "react";

type GlobalCosts = {
  range: string;
  totalCalls: number;
  totalCostUsd: number;
  uniqueUsers: number;
  avgCostPerActiveUserUsd: number;
  byPurpose: { purpose: string; calls: number; costUsd: number }[];
};

type UserCosts = {
  userId: string;
  today: {
    calls: number;
    costUsd: number;
    byPurpose: { purpose: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[];
  };
  month: {
    calls: number;
    costUsd: number;
    byPurpose: { purpose: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[];
  };
  recentCalls: {
    createdAt: string;
    purpose: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }[];
};

function inr(usd: number) {
  return `Rs ${(usd * 83).toFixed(2)}`;
}

export function AdminCostClient() {
  const [range, setRange] = useState<"7d" | "30d">("30d");
  const [userId, setUserId] = useState("");
  const [globalData, setGlobalData] = useState<GlobalCosts | null>(null);
  const [userData, setUserData] = useState<UserCosts | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [error, setError] = useState("");

  const totalInr = useMemo(() => (globalData ? inr(globalData.totalCostUsd) : "Rs 0.00"), [globalData]);

  async function loadGlobal() {
    setLoadingGlobal(true);
    setError("");
    try {
      const res = await fetch(`/api/internal/ai-costs?range=${range}`, {
        credentials: "include",
      });
      const data = (await res.json()) as GlobalCosts & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load global costs.");
        return;
      }
      setGlobalData(data);
    } catch {
      setError("Network error while loading global costs.");
    } finally {
      setLoadingGlobal(false);
    }
  }

  async function loadUser() {
    if (!userId.trim()) return;
    setLoadingUser(true);
    setError("");
    try {
      const res = await fetch(`/api/internal/ai-costs/users/${encodeURIComponent(userId.trim())}`, {
        credentials: "include",
      });
      const data = (await res.json()) as UserCosts & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load user costs.");
        return;
      }
      setUserData(data);
    } catch {
      setError("Network error while loading user costs.");
    } finally {
      setLoadingUser(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Admin AI Costs</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Track usage and margin for Rs 99 plan</p>
      </div>

      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Global</p>
        <div className="flex gap-2">
          <select
            value={range}
            onChange={(e) => setRange((e.target.value as "7d" | "30d") ?? "30d")}
            className="rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-[var(--white)]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            type="button"
            onClick={() => void loadGlobal()}
            disabled={loadingGlobal}
            className="rounded-xl bg-[#BEFF47] px-4 py-2 text-sm font-semibold text-[#06080A] disabled:opacity-50"
          >
            {loadingGlobal ? "Loading..." : "Load global"}
          </button>
        </div>
      </div>

      {globalData ? (
        <div className="premium-card rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Global summary ({globalData.range})</p>
          <p className="text-sm text-gray-700 dark:text-slate-200">Calls: {globalData.totalCalls}</p>
          <p className="text-sm text-gray-700 dark:text-slate-200">
            Total cost: ${globalData.totalCostUsd.toFixed(4)} ({totalInr})
          </p>
          <p className="text-sm text-gray-700 dark:text-slate-200">Active users: {globalData.uniqueUsers}</p>
          <p className="text-sm text-gray-700 dark:text-slate-200">
            Avg cost/user: ${globalData.avgCostPerActiveUserUsd.toFixed(4)} ({inr(globalData.avgCostPerActiveUserUsd)})
          </p>
          <div className="pt-2 space-y-1">
            {globalData.byPurpose.map((r) => (
              <p key={r.purpose} className="text-xs text-gray-600 dark:text-slate-300">
                {r.purpose}: {r.calls} calls · ${r.costUsd.toFixed(4)}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Per user</p>
        <div className="flex gap-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-sm text-[var(--white)]"
          />
          <button
            type="button"
            onClick={() => void loadUser()}
            disabled={!userId.trim() || loadingUser}
            className="rounded-xl border border-[#BEFF47]/35 bg-[#BEFF47]/10 px-4 py-2 text-sm font-semibold text-[#B8E86A] disabled:opacity-50"
          >
            {loadingUser ? "Loading..." : "Load user"}
          </button>
        </div>
      </div>

      {userData ? (
        <div className="premium-card rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">User: {userData.userId}</p>
          <p className="text-xs text-gray-600 dark:text-slate-300">
            Today: {userData.today.calls} calls · ${userData.today.costUsd.toFixed(4)} ({inr(userData.today.costUsd)})
          </p>
          <p className="text-xs text-gray-600 dark:text-slate-300">
            Month: {userData.month.calls} calls · ${userData.month.costUsd.toFixed(4)} ({inr(userData.month.costUsd)})
          </p>
          <div className="pt-2 space-y-1">
            {userData.month.byPurpose.map((r) => (
              <p key={r.purpose} className="text-[11px] text-gray-600 dark:text-slate-300">
                {r.purpose}: {r.calls} calls · ${r.costUsd.toFixed(4)}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-[#FF5C7A]">{error}</p> : null}
    </div>
  );
}
