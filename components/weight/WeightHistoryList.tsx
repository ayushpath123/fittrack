"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatWeightHistoryDate } from "@/lib/weight-analytics";
import { WeightLogModal } from "@/components/weight/WeightLogModal";
import type { WeightLogType } from "@/types";

type WeightHistoryListProps = {
  logs: WeightLogType[];
  onUpdate: (id: string, weight: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function WeightHistoryList({ logs, onUpdate, onDelete }: WeightHistoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const editingLog = sorted.find((l) => l.id === editingId);

  async function handleDelete(id: string) {
    if (!confirm("Delete this weight entry?")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (sorted.length === 0) return null;

  return (
    <>
      <div className="premium-card overflow-hidden rounded-2xl">
        <p className="border-b border-white/[0.06] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          History
        </p>
        {sorted.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-[var(--white)]">{formatWeightHistoryDate(log.date)}</p>
              <p className="text-[11px] text-[var(--hint)]">
                {new Date(log.loggedAt ?? log.date).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[var(--white)]">{log.weight.toFixed(1)} kg</p>
              <button
                type="button"
                onClick={() => setEditingId(log.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-[var(--muted)] hover:text-[var(--white)]"
                aria-label="Edit entry"
              >
                <Pencil size={14} aria-hidden />
              </button>
              <button
                type="button"
                disabled={deletingId === log.id}
                onClick={() => void handleDelete(log.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-[var(--muted)] hover:text-red-400 disabled:opacity-40"
                aria-label="Delete entry"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </div>

      <WeightLogModal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        initialValue={editingLog?.weight.toString() ?? ""}
        title="Edit Weight"
        onSave={async (weight) => {
          if (!editingId) return;
          await onUpdate(editingId, weight);
          setEditingId(null);
        }}
      />
    </>
  );
}
