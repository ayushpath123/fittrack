import { toLocalDateKey } from "@/lib/date";

export type WeightChartPoint = {
  dateKey: string;
  label: string;
  weight: number | null;
};

export function buildWeightSeries(
  rows: { date: Date | string; weight: number }[],
  endDate: Date = new Date(),
  days = 7,
): WeightChartPoint[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = toLocalDateKey(new Date(row.date));
    byDay.set(key, row.weight);
  }

  const out: WeightChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    out.push({
      dateKey: key,
      label: d.toLocaleDateString("en", { weekday: "short" }),
      weight: byDay.get(key) ?? null,
    });
  }
  return out;
}
