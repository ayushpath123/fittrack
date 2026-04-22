"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Send, Sparkles } from "lucide-react";

type CoachAction = { label: string; href: string };
type ChatTurn = { role: "user" | "assistant"; content: string };
const CHAT_MEMORY_KEY = "coach_chat_v1";

const STARTERS = [
  "How should I finish today to hit my calorie target?",
  "Am I logging meals often enough this week?",
  "What’s one small workout I can do if I’m short on time?",
];

export function CoachClient() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [actions, setActions] = useState<CoachAction[]>([]);
  const [lastToolNames, setLastToolNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const billingReady = true;
  const [hasPro, setHasPro] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_MEMORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const safe = parsed
        .filter(
          (t): t is ChatTurn =>
            !!t &&
            typeof t === "object" &&
            (t as { role?: unknown }).role !== undefined &&
            (t as { content?: unknown }).content !== undefined &&
            ((t as { role: string }).role === "user" || (t as { role: string }).role === "assistant") &&
            typeof (t as { content: unknown }).content === "string",
        )
        .slice(-12);
      setChat(safe);
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(chat.slice(-12)));
    } catch {
      // ignore storage issues
    }
  }, [chat]);

  useEffect(() => {
    void fetch("/api/billing/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { hasPro?: boolean }) => setHasPro(!!d.hasPro))
      .catch(() => setHasPro(false));
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || !hasPro) return;
    setBusy(true);
    setError("");
    setActions([]);
    setMessage("");
    const userTurn: ChatTurn = { role: "user", content: q };
    const nextChat = [...chat, userTurn].slice(-12);
    setChat(nextChat);
    const priorTurns = nextChat.slice(0, -1).slice(-8);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, history: priorTurns }),
      });
      const data = (await res.json()) as {
        error?: string;
        diagnosis?: string;
        key_issues?: string[];
        action_plan?: string[];
        expected_impact?: string;
        confidence?: number;
        paywall?: boolean;
      };
      if (res.status === 403 && data.error === "PRO_REQUIRED") {
        setChat((prev) => prev.slice(0, -1));
        setHasPro(false);
        setError("AI Coach is part of Pro. Upgrade to continue.");
        return;
      }
      if (!res.ok || !data.diagnosis) {
        setChat((prev) => prev.slice(0, -1));
        setError(data.error ?? "Coach could not answer right now.");
        return;
      }
      const coachReply = [
        data.diagnosis,
        Array.isArray(data.key_issues) && data.key_issues.length ? `Key issues: ${data.key_issues.join(", ")}` : "",
        Array.isArray(data.action_plan) && data.action_plan.length ? `Action plan:\n- ${data.action_plan.join("\n- ")}` : "",
        data.expected_impact ? `Expected impact: ${data.expected_impact}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      setChat((prev) => [...prev, { role: "assistant" as const, content: coachReply }].slice(-12));
      setLastToolNames([]);
      setActions([]);
    } catch {
      setChat((prev) => prev.slice(0, -1));
      setError("Network error.");
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
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,.1)] px-2.5 py-1.5 text-xs text-[var(--muted)]"
          >
            <ChevronLeft size={13} />
            Back
          </Link>
        </div>
        <div className="premium-card rounded-2xl p-5">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
            <Sparkles size={11} />
            Pro feature
          </div>
          <h1 className="num mt-2 text-xl font-bold text-[var(--white)]">AI Coach</h1>
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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,.1)] px-2.5 py-1.5 text-xs text-[var(--muted)]"
        >
          <ChevronLeft size={13} />
          Back
        </Link>
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
          <Sparkles size={11} />
          AI Coach V3
        </span>
      </div>

      <div className="premium-card rounded-2xl p-4">
        <h1 className="num text-xl font-bold text-[var(--white)]">AI Coach</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Answers use your goals and recent logs from this app. First question is free, then premium.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => {
                setMessage(s);
                void send(s);
              }}
              className="rounded-full border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] px-2.5 py-1 text-left text-[10px] font-medium text-[#B8E86A] active:scale-[0.98] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Ask anything about your week, targets, or habits…"
            className="min-h-[88px] flex-1 rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[rgba(190,255,71,.45)] focus:outline-none"
          />
        </div>
        <button
          type="button"
          disabled={busy || !message.trim()}
          onClick={() => void send(message)}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {busy ? "Thinking…" : "Ask coach"}
        </button>

        {error ? (
          <p className="mt-2 text-xs text-[#FF5C7A]">
            {error}{" "}
            {error.includes("Pro") ? (
              <Link href="/pricing" className="font-semibold text-[#B8E86A] underline">
                Pricing
              </Link>
            ) : null}
          </p>
        ) : null}

        {chat.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Conversation</p>
              <button
                type="button"
                onClick={() => {
                  setChat([]);
                  setActions([]);
                  setLastToolNames([]);
                  try {
                    window.localStorage.removeItem(CHAT_MEMORY_KEY);
                  } catch {
                    // ignore storage issues
                  }
                }}
                className="text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--white)]"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {chat.map((turn, idx) => (
                <div
                  key={`${turn.role}-${idx}-${turn.content.slice(0, 24)}`}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    turn.role === "assistant"
                      ? "border-[rgba(190,255,71,.3)] bg-[rgba(190,255,71,.1)] text-[var(--white)]"
                      : "border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] text-[var(--white)]"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    {turn.role === "assistant" ? "Coach" : "You"}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{turn.content}</p>
                </div>
              ))}
            </div>
            {lastToolNames.length > 0 ? (
              <p className="pt-1 text-[10px] text-[var(--muted)]">Model-called tools: {lastToolNames.join(" → ")}</p>
            ) : null}
            {actions.length > 0 ? (
              <div className="pt-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Suggested actions</p>
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <Link
                      key={a.href + a.label}
                      href={a.href}
                      className="inline-flex rounded-lg border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-2.5 py-1.5 text-[11px] font-semibold text-[#B8E86A]"
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
