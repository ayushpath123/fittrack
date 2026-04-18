"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Download, Upload } from "lucide-react";
import { SettingsAppearance } from "@/components/SettingsAppearance";
import { SignOutButton } from "@/components/SignOutButton";

const inputFieldClass =
  "w-full rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-sm text-[var(--white)] transition-all placeholder:text-[var(--hint)] focus:border-[#BEFF47]/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#BEFF47]/15";

const labelClass = "mb-1 text-xs font-medium text-[var(--muted)]";

export default function SettingsPage() {
  const [calorieTarget, setCalorieTarget] = useState(1500);
  const [proteinTarget, setProteinTarget] = useState(110);
  const [carbTarget, setCarbTarget] = useState(180);
  const [fatTarget, setFatTarget] = useState(55);
  const [waterTargetMl, setWaterTargetMl] = useState(2000);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [notifSupport, setNotifSupport] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [billing, setBilling] = useState<{
    plan: string;
    hasPro: boolean;
    subscriptionStatus: string | null;
    canManageBilling: boolean;
  } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/goals", { credentials: "include" });
    const data = await res.json();
    setCalorieTarget(data.calorieTarget ?? 1500);
    setProteinTarget(data.proteinTarget ?? 110);
    setCarbTarget(data.carbTarget ?? 180);
    setFatTarget(data.fatTarget ?? 55);
    setWaterTargetMl(data.waterTargetMl ?? 2000);
    setReminderEnabled(!!data.reminderEnabled);
    setReminderTime(typeof data.reminderTime === "string" ? data.reminderTime : "09:00");
  }, []);

  useEffect(() => {
    setNotifSupport(typeof window !== "undefined" && "Notification" in window);
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    void fetch("/api/billing/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { plan?: string; hasPro?: boolean; subscriptionStatus?: string | null; canManageBilling?: boolean }) => {
        setBilling({
          plan: d.plan ?? "free",
          hasPro: !!d.hasPro,
          subscriptionStatus: d.subscriptionStatus ?? null,
          canManageBilling: !!d.canManageBilling,
        });
      })
      .catch(() => setBilling(null));
  }, []);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id || !["appearance", "daily-targets", "reminders", "your-data", "import-backup"].includes(id)) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading]);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        calorieTarget,
        proteinTarget,
        carbTarget,
        fatTarget,
        waterTargetMl,
        reminderEnabled,
        reminderTime,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "Settings saved." : "Could not save settings.");
  }

  async function requestNotificationPermission() {
    if (!notifSupport) return;
    const p = await Notification.requestPermission();
    setNotifPermission(p);
    setMessage(p === "granted" ? "Notifications enabled for this device." : "Notifications not allowed.");
  }

  async function downloadExport(format: "json" | "csv") {
    setExporting(format);
    setMessage("");
    try {
      const res = await fetch(`/api/export?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? `fittrack-export-${Date.now()}.json` : `fittrack-weights-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(format === "json" ? "Full export downloaded." : "Weight CSV downloaded.");
    } catch {
      setMessage("Export failed. Try again.");
    } finally {
      setExporting(null);
    }
  }

  async function openBillingPortal() {
    setPortalBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setMessage(data.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setMessage("Billing portal failed.");
    } finally {
      setPortalBusy(false);
    }
  }

  async function runImport(file: File) {
    setImporting(true);
    setMessage("");
    try {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      if (json.version !== 1) {
        setMessage("Invalid backup: expected version 1.");
        return;
      }
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: importMode, backup: json }),
      });
      const data = (await res.json()) as { error?: string; mealsCreated?: number; workoutsCreated?: number; weightUpserted?: number; hydrationUpserted?: number };
      if (!res.ok) {
        setMessage(data.error ?? "Import failed.");
        return;
      }
      setMessage(
        `Import complete: ${data.mealsCreated ?? 0} meals, ${data.workoutsCreated ?? 0} workouts, ${data.weightUpserted ?? 0} weight days, ${data.hydrationUpserted ?? 0} hydration days.`,
      );
      await load();
    } catch {
      setMessage("Could not read or import that file.");
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading settings...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Goals, reminders, data & appearance</p>
      </div>
      <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 dark:text-slate-400" aria-label="Settings sections">
        <a href="#subscription" className="text-[#BEFF47] dark:text-[#B8E86A] font-medium hover:underline">
          Subscription
        </a>
        <span className="text-gray-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <a href="#appearance" className="text-[#BEFF47] dark:text-[#B8E86A] font-medium hover:underline">
          Theme
        </a>
        <span className="text-gray-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <a href="#daily-targets" className="text-[#BEFF47] dark:text-[#B8E86A] font-medium hover:underline">
          Targets
        </a>
        <span className="text-gray-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <a href="#reminders" className="text-[#BEFF47] dark:text-[#B8E86A] font-medium hover:underline">
          Reminders
        </a>
        <span className="text-gray-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <a href="#your-data" className="text-[#BEFF47] dark:text-[#B8E86A] font-medium hover:underline">
          Data
        </a>
        <span className="text-gray-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <a href="#import-backup" className="text-[#BEFF47] dark:text-[#B8E86A] font-medium hover:underline">
          Import
        </a>
      </nav>
      <div id="subscription" className="premium-card scroll-mt-28 space-y-3 rounded-2xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Subscription</p>
        {billing ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              Current plan:{" "}
              <strong className="text-gray-900 dark:text-white">{billing.hasPro ? "Pro" : "Free"}</strong>
              {billing.subscriptionStatus ? (
                <span className="text-gray-500 dark:text-slate-400"> — {billing.subscriptionStatus}</span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {billing.hasPro && billing.canManageBilling ? (
                <button
                  type="button"
                  disabled={portalBusy}
                  onClick={() => void openBillingPortal()}
                  className="rounded-xl bg-[#BEFF47] px-3 py-2 text-xs font-semibold text-[#06080A] hover:bg-[#CCFF5A] disabled:opacity-50"
                >
                  {portalBusy ? "Opening…" : "Manage billing"}
                </button>
              ) : null}
              {!billing.hasPro ? (
                <a
                  href="/pricing"
                  className="inline-flex items-center rounded-xl border border-[#BEFF47]/35 bg-[#BEFF47]/10 px-3 py-2 text-xs font-semibold text-[#06080A] hover:bg-[#BEFF47]/18 dark:text-[#B8E86A]"
                >
                  Upgrade to Pro (AI features)
                </a>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500">
              Pro unlocks AI meal estimates and the AI coach. Configure Stripe keys in production.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading subscription…</p>
        )}
      </div>
      <SettingsAppearance />
      <div id="daily-targets" className="premium-card space-y-3 scroll-mt-28 rounded-2xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Daily targets</p>
        <div>
          <p className={labelClass}>Calorie target</p>
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(parseInt(e.target.value || "0", 10))}
            className={inputFieldClass}
          />
        </div>
        <div>
          <p className={labelClass}>Protein target (g)</p>
          <input
            type="number"
            value={proteinTarget}
            onChange={(e) => setProteinTarget(parseInt(e.target.value || "0", 10))}
            className={inputFieldClass}
          />
        </div>
        <div>
          <p className={labelClass}>Carbs target (g)</p>
          <input
            type="number"
            value={carbTarget}
            onChange={(e) => setCarbTarget(parseInt(e.target.value || "0", 10))}
            className={inputFieldClass}
          />
        </div>
        <div>
          <p className={labelClass}>Fat target (g)</p>
          <input
            type="number"
            value={fatTarget}
            onChange={(e) => setFatTarget(parseInt(e.target.value || "0", 10))}
            className={inputFieldClass}
          />
        </div>
        <div>
          <p className={labelClass}>Water goal (ml / day)</p>
          <input
            type="number"
            value={waterTargetMl}
            onChange={(e) => setWaterTargetMl(parseInt(e.target.value || "0", 10))}
            className={inputFieldClass}
          />
        </div>
      </div>

      <div id="reminders" className="premium-card space-y-3 scroll-mt-28 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-[#BEFF47]" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Daily reminder</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          We&apos;ll try a browser notification at the time you pick (this tab or app must be allowed to notify; it is not a
          server push).
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="rounded border-gray-300 text-[#BEFF47] focus:ring-[#BEFF47]/50"
          />
          Enable daily reminder
        </label>
        <div>
          <p className={labelClass}>Time</p>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className={inputFieldClass}
          />
        </div>
        {notifSupport && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 dark:text-slate-400">Permission: {notifPermission}</p>
            {notifPermission !== "granted" && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="rounded-xl border border-white/12 bg-white/[0.04] py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.07] hover:text-[#B8E86A] active:scale-95"
              >
                Allow notifications in browser
              </button>
            )}
          </div>
        )}
      </div>

      <div id="your-data" className="premium-card space-y-3 scroll-mt-28 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-[#BEFF47]" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Your data (export)</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Download a full <strong>JSON backup</strong> of meals, workouts, weight, hydration, and goals, or a <strong>CSV</strong> of
          weight entries only. Files save to your device.
        </p>
        <button
          type="button"
          disabled={exporting !== null}
          onClick={() => downloadExport("json")}
          className="w-full rounded-xl bg-[#BEFF47] py-2.5 text-sm font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95 disabled:opacity-60"
        >
          {exporting === "json" ? "Preparing…" : "Download full backup (JSON)"}
        </button>
        <button
          type="button"
          disabled={exporting !== null}
          onClick={() => downloadExport("csv")}
          className="w-full rounded-xl border border-white/12 bg-white/[0.04] py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.07] hover:text-[#B8E86A] active:scale-95 disabled:opacity-60"
        >
          {exporting === "csv" ? "Preparing…" : "Download weight log only (CSV)"}
        </button>
      </div>

      <div
        id="import-backup"
        className="space-y-3 scroll-mt-28 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-amber-400" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-200/90">Import JSON backup</p>
        </div>
        <p className="text-sm text-amber-100/85">
          Restore data from a <strong>full JSON export</strong> created by this app. Meal items reference food IDs in <em>this</em>{" "}
          database — imports from another deployment may fail unless food IDs match.
        </p>
        <div>
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">Mode</p>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--white)]">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
                className="rounded border-white/20 text-amber-500 focus:ring-amber-500/40"
              />
              Merge (append / upsert by day)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--white)]">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
                className="rounded border-white/20 text-amber-500 focus:ring-amber-500/40"
              />
              Replace (wipe my log data)
            </label>
          </div>
        </div>
        <input
          ref={importFileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void runImport(f);
          }}
        />
        <button
          type="button"
          disabled={importing}
          onClick={() => importFileRef.current?.click()}
          className="w-full rounded-xl border border-amber-500/35 bg-amber-600/90 py-2.5 text-sm font-semibold text-white transition-transform hover:bg-amber-500 active:scale-95 disabled:opacity-60"
        >
          {importing ? "Importing…" : "Choose JSON file…"}
        </button>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full rounded-xl bg-[#BEFF47] py-3 font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95 disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save all settings"}
      </button>
      <SignOutButton />

      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
