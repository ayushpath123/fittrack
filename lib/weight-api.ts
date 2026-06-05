import type { WeightLogType } from "@/types";

export async function fetchWeightLogs(range: "7d" | "30d" | "90d" = "90d"): Promise<WeightLogType[]> {
  const res = await fetch(`/api/weight?range=${range}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch weight logs");
  return res.json();
}

export async function saveWeight(weight: number, date?: string): Promise<WeightLogType> {
  const res = await fetch("/api/weight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ date: date ?? new Date().toISOString().split("T")[0], weight }),
  });
  if (!res.ok) throw new Error("Failed to save weight");
  return res.json();
}

export async function updateWeight(id: string, weight: number): Promise<WeightLogType> {
  const res = await fetch(`/api/weight/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ weight }),
  });
  if (!res.ok) throw new Error("Failed to update weight");
  return res.json();
}

export async function deleteWeight(id: string): Promise<void> {
  const res = await fetch(`/api/weight/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete weight");
}

function dayKey(iso: string): string {
  return iso.split("T")[0];
}

export function mergeWeightLog(logs: WeightLogType[], saved: WeightLogType): WeightLogType[] {
  const savedDay = dayKey(saved.date);
  return [...logs.filter((l) => dayKey(l.date) !== savedDay), saved].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function removeWeightLog(logs: WeightLogType[], id: string): WeightLogType[] {
  return logs.filter((l) => l.id !== id);
}

export function replaceWeightLog(logs: WeightLogType[], updated: WeightLogType): WeightLogType[] {
  return logs.map((l) => (l.id === updated.id ? updated : l)).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
