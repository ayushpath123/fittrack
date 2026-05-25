"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Medal, Sword, Zap, CheckCircle2, Circle, Target, Gift } from "lucide-react";
import type { GamificationSummary } from "@/lib/gamification";

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (prev.current === target) return;
    const start = prev.current;
    const diff = target - start;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * ease));
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return display;
}

/** Countdown to next UTC midnight (for daily chest reset). */
function useUtcCountdownToNextMidnight(enabled: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const calc = () => {
      const now = new Date();
      const end = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      );
      setSecs(Math.max(0, Math.floor((end - now.getTime()) / 1000)));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [enabled]);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

type FloatingNum = { id: number; value: number; x: number };

type Props = { compact?: boolean };

async function postGamification(path: string): Promise<GamificationSummary> {
  const res = await fetch(path, { method: "POST", credentials: "include" });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /**/
    }
    throw new Error(msg);
  }
  return (await res.json()) as GamificationSummary;
}

export function GamificationPanel({ compact = false }: Props) {
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [floats, setFloats] = useState<FloatingNum[]>([]);
  const [bossShake, setBossShake] = useState(false);
  const [chestAnim, setChestAnim] = useState(false);
  const [xpFlash, setXpFlash] = useState(false);
  const floatId = useRef(0);

  const countdown = useUtcCountdownToNextMidnight(!summary?.dailyChestReady);
  const animCoins = useAnimatedNumber(summary?.coins ?? 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/gamification/summary", { credentials: "include" });
        if (!res.ok) return;
        const payload = (await res.json()) as GamificationSummary;
        if (mounted) setSummary(payload);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const spawnFloat = useCallback((value: number) => {
    const id = ++floatId.current;
    const x = 30 + Math.random() * 40;
    setFloats((f) => [...f, { id, value, x }]);
    setTimeout(() => setFloats((f) => f.filter((n) => n.id !== id)), 1200);
  }, []);

  const runMutation = useCallback(
    async (path: string, optimistic: (prev: GamificationSummary) => GamificationSummary) => {
      if (!summary) return;
      const prev = summary;
      setSummary(optimistic(prev));
      try {
        const next = await postGamification(path);
        setSummary(next);
        if (next.level > prev.level) {
          /* optional: could surface level-up toast */
        }
      } catch {
        setSummary(prev);
      }
    },
    [summary],
  );

  if (loading) return <div className="premium-card h-24 animate-pulse rounded-2xl" aria-hidden />;
  if (!summary) return null;
  const snap = summary;

  const xpPct = Math.max(
    0,
    Math.min(100, Math.round((summary.xpIntoLevel / Math.max(1, summary.xpForNextLevel)) * 100)),
  );
  const weeklyGoalPct = Math.max(
    0,
    Math.min(100, Math.round((summary.weeklyGoalProgress / Math.max(1, summary.weeklyGoalTarget)) * 100)),
  );
  const dailyChestReady = summary.dailyChestReady;
  const bossReady = summary.bossReady;
  const bossHp = Math.max(0, summary.weeklyGoalTarget - summary.weeklyGoalProgress);
  const bossHpPct = Math.max(
    0,
    Math.min(100, Math.round((bossHp / Math.max(1, summary.weeklyGoalTarget)) * 100)),
  );

  const streakTier =
    summary.globalStreak >= 90 ? "legendary" :
    summary.globalStreak >= 30 ? "epic" :
    summary.globalStreak >= 14 ? "rare" : "common";
  const streakColors: Record<string, string> = {
    legendary: "#FF6B1A",
    epic:      "#C084FC",
    rare:      "#60A5FA",
    common:    "#6EE7B7",
  };
  const streakColor = streakColors[streakTier];

  function claimDailyChest() {
    if (!dailyChestReady) return;
    void runMutation("/api/gamification/claim-chest", (p) => ({
      ...p,
      coins: p.coins + 40,
      dailyChestReady: false,
    })).then(() => {
      setChestAnim(true);
      spawnFloat(+40);
      setTimeout(() => setChestAnim(false), 600);
    });
  }

  function claimWeeklyBoss() {
    if (!bossReady) return;
    void runMutation("/api/gamification/claim-boss", (p) => ({
      ...p,
      coins: p.coins + 140,
      freezeInventory: p.freezeInventory + 1,
      bossReady: false,
      weeklyBossState: { ...p.weeklyBossState, lootClaimed: true },
    })).then(() => {
      setBossShake(true);
      spawnFloat(+140);
      setTimeout(() => setBossShake(false), 500);
    });
  }

  function buyFreeze() {
    if (snap.coins < 120) return;
    void runMutation("/api/gamification/buy-freeze", (p) => ({
      ...p,
      coins: p.coins - 120,
      freezeInventory: p.freezeInventory + 1,
    })).then(() => spawnFloat(-120));
  }

  function buyXpBoostToken() {
    if (snap.coins < 90) return;
    void runMutation("/api/gamification/buy-xp-boost", (p) => ({
      ...p,
      coins: p.coins - 90,
      xpBoostTokens: p.xpBoostTokens + 1,
    })).then(() => spawnFloat(-90));
  }

  function armFreeze() {
    if (snap.freezeInventory < 1 || snap.freezeArmed) return;
    void runMutation("/api/gamification/arm-freeze", (p) => ({
      ...p,
      freezeInventory: p.freezeInventory - 1,
      freezeArmed: true,
    }));
  }

  function useXpBoostToken() {
    if (snap.xpBoostTokens < 1) return;
    void runMutation("/api/gamification/use-xp-boost", (p) => ({
      ...p,
      xpBoostTokens: p.xpBoostTokens - 1,
      coins: p.coins + 30,
    })).then(() => {
      setXpFlash(true);
      spawnFloat(+30);
      setTimeout(() => setXpFlash(false), 700);
    });
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity:1; transform:translateY(0) scale(1); }
          80%  { opacity:1; }
          100% { opacity:0; transform:translateY(-56px) scale(1.3); }
        }
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%     { transform:translateX(-5px); }
          40%     { transform:translateX(5px); }
          60%     { transform:translateX(-4px); }
          80%     { transform:translateX(4px); }
        }
        @keyframes chestPop {
          0%   { transform:scale(1); }
          40%  { transform:scale(1.25) rotate(-6deg); }
          70%  { transform:scale(0.92) rotate(4deg); }
          100% { transform:scale(1) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,207,128,0); }
          50%      { box-shadow: 0 0 12px 3px rgba(255,207,128,0.35); }
        }
        @keyframes bossGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(87,180,255,0); }
          50%      { box-shadow: 0 0 14px 4px rgba(87,180,255,0.4); }
        }
        @keyframes xpShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fireFlicker {
          0%,100% { transform: scaleY(1) rotate(-1deg); opacity: 1; }
          33%     { transform: scaleY(1.1) rotate(1.5deg); opacity: 0.9; }
          66%     { transform: scaleY(0.93) rotate(-2deg); opacity: 1; }
        }
        @keyframes levelBadgePop {
          0%   { transform: scale(0.7); opacity:0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity:1; }
        }
        @keyframes slideIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes xpFlash {
          0%,100% { opacity:1; }
          50%     { opacity:0.55; }
        }
        .gpanel-chest-btn:not(:disabled) { animation: pulseGlow 1.8s ease-in-out infinite; }
        .gpanel-boss-btn:not(:disabled)  { animation: bossGlow  2s   ease-in-out infinite; }
        .gpanel-chest-pop { animation: chestPop 0.5s cubic-bezier(.36,.07,.19,.97); }
        .gpanel-boss-shake { animation: shake 0.45s ease; }
        .gpanel-xp-flash { animation: xpFlash 0.7s ease; }
        .gpanel-fire { animation: fireFlicker 0.8s ease-in-out infinite; display:inline-block; }
        .gpanel-badge-pop { animation: levelBadgePop 0.45s cubic-bezier(.36,.07,.19,.97) both; }
        .gpanel-slide { animation: slideIn 0.35s ease both; }
      `}</style>

      <div style={{ position: "relative" }}>
        {floats.map((f) => (
          <div
            key={f.id}
            style={{
              position: "absolute", top: 0, left: `${f.x}%`,
              pointerEvents: "none", zIndex: 50,
              fontSize: 13, fontWeight: 700,
              color: f.value > 0 ? "#BEFF47" : "#FF7B7B",
              animation: "floatUp 1.1s ease forwards",
            }}
          >
            {f.value > 0 ? `+${f.value}` : f.value} 🪙
          </div>
        ))}
      </div>

      <div className="premium-card gpanel-slide rounded-2xl p-4 space-y-3.5">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="gpanel-fire"
              style={{ fontSize: 26, lineHeight: 1, filter: `drop-shadow(0 0 6px ${streakColor}aa)` }}
              title={`${streakTier} streak`}
            >
              {streakTier === "legendary" ? "🔥" :
               streakTier === "epic"      ? "⚡" :
               streakTier === "rare"      ? "💧" : "✨"}
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">Global streak</p>
              <p className="num text-xl font-black leading-tight" style={{ color: streakColor }}>
                {summary.globalStreak}
                <span className="text-xs font-semibold text-[var(--muted)] ml-1">days</span>
              </p>
            </div>
          </div>

          <div
            className="gpanel-badge-pop flex flex-col items-center justify-center rounded-xl px-3 py-1.5"
            style={{ background: "rgba(190,255,71,0.12)", border: "1px solid rgba(190,255,71,0.3)" }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">{summary.rank}</p>
            <p className="num text-lg font-black text-[#BEFF47] leading-tight">{summary.level}</p>
          </div>
        </div>

        {summary.leaderboard && (
          <Link
            href="/leaderboards"
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-all hover:scale-[1.015]"
            style={{ background: "rgba(255,207,128,0.1)", border: "1px solid rgba(255,207,128,0.28)" }}
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FFCF80]">
              <Medal size={12} aria-hidden /> Global rank
            </span>
            <span className="num text-right text-[13px] font-black text-[var(--white)]">
              #{summary.leaderboard.globalRank}{" "}
              <span className="font-medium text-[var(--muted)]">· Top {summary.leaderboard.percentile}%</span>
            </span>
          </Link>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "🪙 Coins",   value: animCoins,      color: "#FFCF80" },
            { label: "❄️ Freeze",  value: summary.freezeInventory, color: "#93C5FD" },
            { label: "⚡ XP boost", value: summary.xpBoostTokens, color: "#D8B4FE" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-2 text-center transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
              <p className="num mt-0.5 text-base font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "🍽 Meals",    v: summary.mealStreak },
            { label: "💪 Workout",  v: summary.workoutStreak },
            { label: "💧 Hydration", v: summary.hydrationStreak },
          ].map(({ label, v }) => (
            <div
              key={label}
              className="rounded-xl p-2 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
              <p className="num mt-0.5 text-sm font-black text-[var(--white)]">{v}<span className="text-[9px] font-normal ml-0.5 text-[var(--muted)]">d</span></p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              <Zap size={11} /> XP progress
            </p>
            <p className="num text-[11px] font-semibold text-[var(--muted)]">
              {summary.xpIntoLevel} / {summary.xpForNextLevel}
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className={xpFlash ? "gpanel-xp-flash" : ""}
              style={{
                height: "100%",
                width: `${xpPct}%`,
                borderRadius: 999,
                background: "linear-gradient(90deg, #8CF63A 0%, #BEFF47 60%, #E6FF99 100%)",
                backgroundSize: "200% 100%",
                animation: `xpShimmer 2.4s linear infinite${xpFlash ? ", xpFlash 0.7s ease" : ""}`,
                transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
          </div>
          <p className="mt-0.5 text-right text-[9px] text-[var(--muted)]">{xpPct}% to next level</p>
        </div>

        {!compact && (
          <>
            <div
              className="rounded-xl p-3 space-y-2.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  <Gift size={12} /> Rewards
                </p>
                {!dailyChestReady && (
                  <span className="text-[10px] text-[var(--muted)]">Next chest in <span className="font-mono font-semibold text-[#FFCF80]">{countdown}</span></span>
                )}
              </div>

              <button
                type="button"
                disabled={!dailyChestReady}
                onClick={claimDailyChest}
                className={`gpanel-chest-btn w-full rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40 ${chestAnim ? "gpanel-chest-pop" : ""}`}
                style={{
                  background: dailyChestReady ? "rgba(255,181,71,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${dailyChestReady ? "rgba(255,181,71,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: "#FFCF80",
                }}
              >
                {dailyChestReady ? "🎁 Claim daily chest  +40 🪙" : "✅ Chest claimed today"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={buyFreeze}
                  disabled={summary.coins < 120}
                  className="rounded-lg px-2 py-2 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-35"
                  style={{ background: "rgba(147,197,253,0.1)", border: "1px solid rgba(147,197,253,0.25)", color: "#93C5FD" }}
                >
                  ❄️ Buy freeze<br /><span className="font-normal opacity-70">120 🪙</span>
                </button>
                <button
                  type="button"
                  onClick={buyXpBoostToken}
                  disabled={summary.coins < 90}
                  className="rounded-lg px-2 py-2 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-35"
                  style={{ background: "rgba(216,180,254,0.1)", border: "1px solid rgba(216,180,254,0.25)", color: "#D8B4FE" }}
                >
                  ⚡ Buy XP boost<br /><span className="font-normal opacity-70">90 🪙</span>
                </button>
              </div>
            </div>

            <div
              className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  <Target size={12} /> Daily quests
                </p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.round((summary.dailyQuestsCompleted / Math.max(1, summary.quests.length)) * 100)}%`,
                        background: "#2DD4A0",
                      }}
                    />
                  </div>
                  <span className="num text-[10px] text-[var(--muted)]">{summary.dailyQuestsCompleted}/{summary.quests.length}</span>
                </div>
              </div>
              {summary.quests.map((quest) => (
                <div
                  key={quest.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all"
                  style={{
                    background: quest.completed ? "rgba(45,212,160,0.07)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${quest.completed ? "rgba(45,212,160,0.3)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  {quest.completed
                    ? <CheckCircle2 size={14} className="shrink-0" style={{ color: "#2DD4A0" }} />
                    : <Circle size={14} className="shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                  }
                  <p className="flex-1 text-[11px] font-medium" style={{ color: quest.completed ? "#B8E86A" : "var(--white)" }}>
                    {quest.label}
                  </p>
                  <span
                    className="num shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black"
                    style={{
                      background: quest.completed ? "rgba(45,212,160,0.2)" : "rgba(255,255,255,0.06)",
                      color: quest.completed ? "#2DD4A0" : "var(--muted)",
                    }}
                  >
                    +{quest.rewardXp} XP
                  </span>
                </div>
              ))}
            </div>

            <div
              className={`rounded-xl p-3 space-y-2 ${bossShake ? "gpanel-boss-shake" : ""}`}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  <Sword size={12} /> Weekly boss
                </p>
                <span className="num text-[10px] text-[var(--muted)]">
                  {summary.weeklyGoalProgress}/{summary.weeklyGoalTarget} days
                </span>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold" style={{ color: bossHp === 0 ? "#2DD4A0" : "#FF7B7B" }}>
                    {bossHp === 0 ? "☠️ Boss defeated!" : `❤️ Boss HP: ${bossHp}`}
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">{bossHpPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${bossHpPct}%`,
                      borderRadius: 999,
                      background: bossHp === 0 ? "#2DD4A0" : "linear-gradient(90deg, #FF4B4B, #FF7B7B)",
                      transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  />
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  style={{
                    height: "100%", width: `${weeklyGoalPct}%`, borderRadius: 999,
                    background: "#57B4FF",
                    transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />
              </div>

              <button
                type="button"
                disabled={!bossReady}
                onClick={claimWeeklyBoss}
                className="gpanel-boss-btn w-full rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-35"
                style={{
                  background: bossReady ? "rgba(87,180,255,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${bossReady ? "rgba(87,180,255,0.45)" : "rgba(255,255,255,0.09)"}`,
                  color: "#8AD4FF",
                }}
              >
                {bossReady ? "⚔️ Claim boss loot  +140 🪙 + Freeze" : "⚔️ Defeat the boss first"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={armFreeze}
                disabled={summary.freezeInventory < 1 || summary.freezeArmed}
                className="rounded-xl px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-35"
                style={{
                  background: "rgba(167,139,250,0.14)",
                  border: "1px solid rgba(167,139,250,0.35)",
                  color: "#C4B5FD",
                }}
              >
                {summary.freezeArmed ? "🛡 Freeze armed!" : "🛡 Arm streak freeze"}
              </button>
              <button
                type="button"
                onClick={useXpBoostToken}
                disabled={summary.xpBoostTokens < 1}
                className="rounded-xl px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-35"
                style={{
                  background: "rgba(45,212,160,0.12)",
                  border: "1px solid rgba(45,212,160,0.35)",
                  color: "#6EECC4",
                }}
              >
                ⚡ Use XP boost token
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "🏆 Best streak", val: `${summary.bestGlobalStreak}d`, color: "#FFCF80" },
                { label: "🛡 Total freeze",  val: `${summary.streakFreezeCharges + summary.freezeInventory}`, color: "#C4B5FD" },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className="rounded-xl p-2 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
                  <p className="num mt-0.5 text-sm font-black" style={{ color }}>{val}</p>
                </div>
              ))}
            </div>

            {summary.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {summary.badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(255,181,71,0.15)", border: "1px solid rgba(255,181,71,0.35)", color: "#FFCF80" }}
                  >
                    <Flame size={10} />{badge}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
