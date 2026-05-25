"use client";

import { useCallback, useEffect, useState } from "react";
import { Medal } from "lucide-react";
import Link from "next/link";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-sm text-[var(--white)] transition-all placeholder:text-[var(--hint)] focus:border-[#BEFF47]/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#BEFF47]/15";

export function LeaderboardIdentityCard() {
  const [alias, setAlias] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/user/leaderboard-profile", { credentials: "include" });
    if (!res.ok) return;
    const d = (await res.json()) as { leaderboardAlias?: string | null; leaderboardPublic?: boolean };
    setAlias(typeof d.leaderboardAlias === "string" ? d.leaderboardAlias : "");
    setIsPublic(!!d.leaderboardPublic);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/user/leaderboard-profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderboardPublic: isPublic,
          leaderboardAlias: alias.trim() || null,
        }),
      });
      if (!res.ok) {
        setMsg("Could not save. Try again.");
        return;
      }
      const d = (await res.json()) as { leaderboardAlias?: string | null; leaderboardPublic?: boolean };
      setAlias(typeof d.leaderboardAlias === "string" ? d.leaderboardAlias : "");
      setIsPublic(!!d.leaderboardPublic);
      setMsg("Saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" aria-hidden />;
  }

  return (
    <div className="premium-card rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <Medal size={16} className="text-[#FFCF80]" />
        <h2 className="text-sm font-semibold text-[var(--white)]">Leaderboard name</h2>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-[var(--muted)]">
        By default you appear as <span className="font-semibold text-[var(--white)]">Rival + short id</span>. Turn on public
        display and set a nickname to show on{" "}
        <Link href="/leaderboards" className="font-semibold text-[#B8E86A] hover:underline">
          Global ranks
        </Link>
        .
      </p>
      <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Nickname (letters, numbers, spaces)</label>
      <input
        className={inputClass}
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="e.g. IronAyush"
        maxLength={24}
        autoComplete="off"
      />
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-[var(--white)]">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/10 accent-[#BEFF47]"
        />
        Show nickname on global leaderboard
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 w-full rounded-xl bg-[#BEFF47] py-2.5 text-sm font-semibold text-[#06080A] transition-opacity disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save leaderboard profile"}
      </button>
      {msg ? <p className="mt-2 text-center text-xs text-[var(--muted)]">{msg}</p> : null}
    </div>
  );
}
