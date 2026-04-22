"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, ChevronLeft, Loader2, Sparkles, Upload } from "lucide-react";

type EstimateResult = {
  source: "cache" | "llm";
  output: {
    items: { name: string }[];
    total: { calories: number; protein: number; carbs: number; fat: number };
    overall_confidence: number;
  };
  warnings?: string[];
  insight?: { meal_insight?: string; day_context?: string; week_signal?: string | null };
  narrative?: string;
  nudge?: { nudge?: string };
  paywallState?: { showPaywall?: boolean; cta?: string };
  error?: string;
};

export default function MealAiPage() {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [billingReady, setBillingReady] = useState(false);
  const [hasPro, setHasPro] = useState(false);

  async function toBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunk));
    }
    return btoa(binary);
  }

  useEffect(() => {
    void fetch("/api/billing/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { hasPro?: boolean }) => setHasPro(!!d.hasPro))
      .finally(() => setBillingReady(true));
  }, []);

  async function runEstimate() {
    if (!description.trim() && !imageFile) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      let imageBase64: string | undefined;
      let imageMediaType: string | undefined;
      if (imageFile) {
        imageBase64 = await toBase64(imageFile);
        imageMediaType = imageFile.type || "image/jpeg";
      }
      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description.trim() || imageFile?.name || "meal", imageBase64, imageMediaType }),
      });
      const data = (await res.json()) as EstimateResult;
      if (res.status === 403 && data.error === "PRO_REQUIRED") {
        setHasPro(false);
        setError("AI meal analysis is available on Pro.");
        return;
      }
      if (!res.ok || !data.output) {
        setError(data.error ?? "AI estimate failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error while estimating meal.");
    } finally {
      setBusy(false);
    }
  }

  if (!billingReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading…
      </div>
    );
  }

  if (!hasPro) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/meals" className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,.1)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
            <ChevronLeft size={13} />
            Back
          </Link>
        </div>
        <div className="premium-card rounded-2xl p-5">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
            <Sparkles size={11} />
            Pro feature
          </div>
          <h1 className="num text-xl font-bold text-[var(--white)]">AI meal analysis</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">This endpoint is now premium-only.</p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-2.5 text-sm font-semibold text-white"
          >
            View Pro pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href="/meals" className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,.1)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
          <ChevronLeft size={13} />
          Back
        </Link>
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
          <Sparkles size={11} />
          AI Meal Estimate V3
        </span>
      </div>

      <div className="premium-card rounded-2xl p-4">
        <h1 className="num text-xl font-bold text-[var(--white)]">Camera AI</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Choose camera or upload, add meal text, then estimate calories and macros.</p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              mode === "camera" ? "border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] text-[#B8E86A]" : "border-[rgba(255,255,255,.1)] text-[var(--muted)]"
            }`}
          >
            <Camera size={12} />
            Camera
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              mode === "upload" ? "border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] text-[#B8E86A]" : "border-[rgba(255,255,255,.1)] text-[var(--muted)]"
            }`}
          >
            <Upload size={12} />
            Upload
          </button>
        </div>

        <label className="mt-3 block rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] p-3 text-center text-sm text-[var(--white)]">
          {imageFile ? imageFile.name : mode === "camera" ? "Take a photo" : "Select an image"}
          <input
            className="hidden"
            type="file"
            accept="image/*"
            capture={mode === "camera" ? "environment" : undefined}
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional: describe portion size, ingredients, cooking style..."
          className="mt-3 w-full rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[rgba(190,255,71,.45)] focus:outline-none"
        />

        <button
          type="button"
          disabled={(!imageFile && !description.trim()) || busy}
          onClick={() => void runEstimate()}
          className="mt-3 w-full rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Estimating..." : "Analyze meal"}
        </button>

        {error ? <p className="mt-2 text-xs text-[#FF5C7A]">{error}</p> : null}

        {result ? (
          <div className="mt-3 rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] p-3">
            <p className="num text-lg font-bold text-[var(--white)]">{Math.round(result.output.total.calories)} kcal</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Protein {Math.round(result.output.total.protein)}g · Carbs {Math.round(result.output.total.carbs)}g · Fat{" "}
              {Math.round(result.output.total.fat)}g
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">Confidence: {Math.round(result.output.overall_confidence * 100)}%</p>
            {result.insight?.meal_insight ? <p className="mt-2 text-xs text-[var(--white)]">{result.insight.meal_insight}</p> : null}
            {result.insight?.day_context ? <p className="mt-1 text-xs text-[var(--muted)]">{result.insight.day_context}</p> : null}
            {result.insight?.week_signal ? <p className="mt-1 text-xs text-[var(--muted)]">{result.insight.week_signal}</p> : null}
            {result.narrative ? <p className="mt-2 text-xs text-[var(--white)]">{result.narrative}</p> : null}
            {result.nudge?.nudge ? <p className="mt-1 text-xs text-[var(--muted)]">Next: {result.nudge.nudge}</p> : null}
            {result.warnings?.length ? <p className="mt-2 text-[10px] text-[#FFB38A]">{result.warnings.join(" · ")}</p> : null}
            {result.paywallState?.showPaywall ? (
              <p className="mt-2 text-[10px] text-[#B8E86A]">
                {result.paywallState.cta}{" "}
                <Link href="/pricing" className="underline">
                  Upgrade
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
