import { addDays, startOfDay, startOfWeekMonday, toLocalDateKey } from "./date";
import { FoodItemType, MealEntryType, MealItem, WeightLogType } from "@/types";

export function calculateItemNutrition(food: FoodItemType, item: MealItem) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  if (item.multiplier !== undefined) {
    calories = food.calories * item.multiplier;
    protein = food.protein * item.multiplier;
    carbs = food.carbs * item.multiplier;
    fat = food.fat * item.multiplier;
  } else if (item.grams !== undefined) {
    const calPerGram = food.calories / food.baseWeightGrams;
    const protPerGram = food.protein / food.baseWeightGrams;
    const carbPerGram = food.carbs / food.baseWeightGrams;
    const fatPerGram = food.fat / food.baseWeightGrams;
    calories = calPerGram * item.grams;
    protein = protPerGram * item.grams;
    carbs = carbPerGram * item.grams;
    fat = fatPerGram * item.grams;
  }

  return {
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export function calculateMealTotals(foods: FoodItemType[], items: MealItem[]) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const item of items) {
    const food = foods.find((f) => f.id === item.foodId);
    if (!food) continue;
    const { calories, protein, carbs, fat } = calculateItemNutrition(food, item);
    totalCalories += calories;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
  }

  return {
    totalCalories: Math.round(totalCalories * 10) / 10,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
  };
}

export function calculateMovingAverage(logs: WeightLogType[], window = 7): number[] {
  return logs.map((_, i) => {
    const slice = logs.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((sum, item) => sum + item.weight, 0) / slice.length;
    return Math.round(avg * 100) / 100;
  });
}

export function calculateFatLossProjection(avgDailyDeficit: number): number {
  return Math.round(((avgDailyDeficit * 30) / 7700) * 100) / 100;
}

/** % of days in the window ending `endDate` where logged day-total calories are at or under target. Unlogged days are not treated as under target. */
export function calculateAdherence(
  entries: MealEntryType[],
  calorieTarget: number,
  windowDays: number,
  endDate: Date = new Date(),
): number {
  if (windowDays <= 0) return 0;
  const end = startOfDay(endDate);
  const start = addDays(end, -(windowDays - 1));
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = toLocalDateKey(new Date(entry.date));
    if (key < startKey || key > endKey) continue;
    byDay.set(key, (byDay.get(key) ?? 0) + entry.totalCalories);
  }
  const daysUnder = [...byDay.values()].filter((total) => total <= calorieTarget).length;
  return Math.round((daysUnder / windowDays) * 100);
}

export function dailyNutritionByDate(entries: MealEntryType[]): Map<string, { calories: number; protein: number; carbs: number; fat: number }> {
  const map = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const entry of entries) {
    const key = toLocalDateKey(new Date(entry.date));
    const cur = map.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    cur.calories += entry.totalCalories;
    cur.protein += entry.totalProtein;
    cur.carbs += entry.totalCarbs;
    cur.fat += entry.totalFat;
    map.set(key, cur);
  }
  return map;
}

export type WeeklyAnalyticsBucket = {
  weekStart: string;
  label: string;
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  loggedDays: number;
  workoutCount: number;
};

function weekLabel(monday: Date, locale: string): string {
  const sunday = addDays(monday, 6);
  const a = monday.toLocaleDateString(locale, { month: "short", day: "numeric" });
  const b = sunday.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}

/** Calendar weeks (Mon–Sun) overlapping [rangeStart, rangeEnd]: avg daily calories/protein assumes 7-day denominator; only days inside the range contribute intake. */
export function buildWeeklyAnalyticsBuckets(
  entries: MealEntryType[],
  workouts: { date: string | Date }[],
  rangeStart: Date,
  rangeEnd: Date,
  locale = "en",
): WeeklyAnalyticsBucket[] {
  const daily = dailyNutritionByDate(entries);
  const rs = startOfDay(rangeStart);
  const re = startOfDay(rangeEnd);

  const workoutsByWeek = new Map<string, number>();
  for (const w of workouts) {
    const d = startOfDay(new Date(w.date));
    if (d < rs || d > re) continue;
    const mon = startOfWeekMonday(d);
    const key = toLocalDateKey(mon);
    workoutsByWeek.set(key, (workoutsByWeek.get(key) ?? 0) + 1);
  }

  let monday = startOfWeekMonday(rs);
  const lastMonday = startOfWeekMonday(re);
  const out: WeeklyAnalyticsBucket[] = [];

  while (monday <= lastMonday) {
    const weekStartKey = toLocalDateKey(monday);
    let weekCalories = 0;
    let weekProtein = 0;
    let weekCarbs = 0;
    let weekFat = 0;
    let loggedDays = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      if (day < rs || day > re) continue;
      const dk = toLocalDateKey(day);
      const t = daily.get(dk);
      if (t && (t.calories > 0 || t.protein > 0 || t.carbs > 0 || t.fat > 0)) loggedDays++;
      weekCalories += t?.calories ?? 0;
      weekProtein += t?.protein ?? 0;
      weekCarbs += t?.carbs ?? 0;
      weekFat += t?.fat ?? 0;
    }
    out.push({
      weekStart: weekStartKey,
      label: weekLabel(monday, locale),
      avgDailyCalories: Math.round((weekCalories / 7) * 10) / 10,
      avgDailyProtein: Math.round((weekProtein / 7) * 10) / 10,
      avgDailyCarbs: Math.round((weekCarbs / 7) * 10) / 10,
      avgDailyFat: Math.round((weekFat / 7) * 10) / 10,
      loggedDays,
      workoutCount: workoutsByWeek.get(weekStartKey) ?? 0,
    });
    monday = addDays(monday, 7);
  }

  return out;
}

export function calculateWeightTrendDeltas(logs: WeightLogType[]) {
  if (logs.length === 0) return { weeklyDelta: 0, monthlyDelta: 0 };
  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1];
  const latestMs = new Date(latest.date).getTime();

  function weightAtOrBefore(targetMs: number): number | null {
    let best: WeightLogType | null = null;
    for (const log of sorted) {
      const t = new Date(log.date).getTime();
      if (t <= targetMs) best = log;
      else break;
    }
    return best?.weight ?? null;
  }

  const weekAgoMs = latestMs - 7 * 86400000;
  const monthAgoMs = latestMs - 30 * 86400000;
  const w0 = weightAtOrBefore(weekAgoMs);
  const m0 = weightAtOrBefore(monthAgoMs);
  const weeklyDelta = w0 !== null ? Math.round((latest.weight - w0) * 10) / 10 : 0;
  const monthlyDelta = m0 !== null ? Math.round((latest.weight - m0) * 10) / 10 : 0;
  return { weeklyDelta, monthlyDelta };
}

/** Coefficient of variation of daily calorie totals (lower = steadier intake). Null if not enough logged days. */
export function dailyCalorieCoefficientOfVariation(entries: MealEntryType[], rangeStart: Date, rangeEnd: Date): number | null {
  const daily = dailyNutritionByDate(entries);
  const rs = toLocalDateKey(startOfDay(rangeStart));
  const re = toLocalDateKey(startOfDay(rangeEnd));
  const vals: number[] = [];
  for (const [k, v] of daily) {
    if (k >= rs && k <= re && v.calories > 0) vals.push(v.calories);
  }
  if (vals.length < 3) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return null;
  const var_ = vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length;
  const sd = Math.sqrt(var_);
  return Math.round((sd / mean) * 1000) / 1000;
}

export function deriveAnalyticsInsights(params: {
  adherence7d: number;
  adherence30d: number;
  weeklyWeightDelta: number;
  intakeCoeffVar: number | null;
  intakeSampleDays: number;
  workoutsPerWeek: number;
  periodDays: number;
}): { text: string; confidence: "low" | "medium" | "high"; hint?: string }[] {
  const insights: { text: string; confidence: "low" | "medium" | "high"; hint?: string }[] = [];
  const windowConfidence: "low" | "medium" | "high" =
    params.periodDays >= 60 ? "high" : params.periodDays >= 28 ? "medium" : "low";
  const intakeConfidence: "low" | "medium" | "high" =
    params.intakeSampleDays >= 14 ? "high" : params.intakeSampleDays >= 7 ? "medium" : "low";

  const cv = params.intakeCoeffVar;

  if (cv !== null && cv < 0.12 && params.weeklyWeightDelta < -0.05) {
    insights.push({
      text: "Calorie intake is steady day to day and weight is trending down—this pattern usually means your deficit is working.",
      confidence: intakeConfidence,
      hint: `${params.intakeSampleDays} logged days in this period.`,
    });
  } else if (cv !== null && cv > 0.22 && params.weeklyWeightDelta >= -0.1) {
    insights.push({
      text: "Calorie swings across days are large while weight is flat or up—try smaller day-to-day variation so trend is easier to read.",
      confidence: intakeConfidence,
      hint: `${params.intakeSampleDays} logged days; clearer after more logged days.`,
    });
  }

  if (params.adherence7d - params.adherence30d > 15) {
    insights.push({
      text: "Recent week adherence is much stronger than the 30-day average—you are tightening the plan lately.",
      confidence: windowConfidence,
    });
  } else if (params.adherence30d - params.adherence7d > 15) {
    insights.push({
      text: "Last 7 days are below your 30-day adherence average—a short refocus on targets may restore the earlier rhythm.",
      confidence: windowConfidence,
    });
  }

  if (params.workoutsPerWeek >= 3 && params.adherence30d < 55) {
    insights.push({
      text: "Workouts look consistent but calorie adherence is moderate—fueling and recovery still need to match training for predictable weight change.",
      confidence: windowConfidence,
      hint: "Compares typical weekly sessions to 30-day adherence.",
    });
  } else if (params.workoutsPerWeek < 1.5 && params.adherence30d >= 70 && params.weeklyWeightDelta > 0.1) {
    insights.push({
      text: "Nutrition adherence is solid and training is light; adding movement can help explain stalls or reinforce a deficit.",
      confidence: windowConfidence,
    });
  }

  if (insights.length === 0) {
    if (params.adherence30d >= 75 && params.weeklyWeightDelta <= 0) {
      insights.push({
        text: "Nutrition adherence is strong and weight trend is moving in a favorable direction.",
        confidence: windowConfidence,
      });
    } else if (params.adherence30d < 50) {
      insights.push({
        text: "Adherence is low relative to target; more consistent logging and meals near goal will make trends actionable.",
        confidence: windowConfidence,
      });
    } else {
      insights.push({
        text: "Signals are mixed—keep logging so week-over-week patterns become clearer.",
        confidence: windowConfidence,
        hint: `Based on ${params.periodDays}-day window.`,
      });
    }
  }

  if (params.workoutsPerWeek >= 3) {
    insights.push({
      text: "Workout frequency is steady this period.",
      confidence: windowConfidence,
    });
  } else {
    insights.push({
      text: "Workout frequency is below a typical “most weeks” rhythm; even one extra session often helps adherence and energy.",
      confidence: windowConfidence,
    });
  }

  return insights.slice(0, 5);
}
