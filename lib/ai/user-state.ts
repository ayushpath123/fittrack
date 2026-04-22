import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay } from "@/lib/date";
import type { UserContext } from "@/types/user";

function mealBucketFromHour(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function classifyMealType(value: string | null | undefined): "breakfast" | "lunch" | "dinner" {
  const v = (value ?? "").toLowerCase();
  if (v.includes("breakfast") || v.includes("morning")) return "breakfast";
  if (v.includes("dinner") || v.includes("night") || v.includes("supper")) return "dinner";
  return "lunch";
}

export async function buildUserContext(userId: string): Promise<UserContext> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = getDaysAgo(6);

  const [goals, user, meals7d, todayMeals, allMeals, lastWeight, coachMessages] = await Promise.all([
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: endOfDay(now) } },
      orderBy: { date: "desc" },
      select: { date: true, mealType: true, totalCalories: true, totalProtein: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: dayStart, lte: endOfDay(now) } },
      select: { totalCalories: true, totalProtein: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { mealType: true, totalCalories: true },
    }),
    prisma.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { weight: true } }),
    prisma.coachMessage.count({ where: { thread: { userId }, role: "user" } }),
  ]);

  const calorieTarget = goals?.calorieTarget ?? 1500;
  const proteinTarget = goals?.proteinTarget ?? 110;
  const todayCalories = todayMeals.reduce((sum, m) => sum + m.totalCalories, 0);
  const todayProtein = todayMeals.reduce((sum, m) => sum + m.totalProtein, 0);

  const daysLogged = new Set(meals7d.map((m) => startOfDay(new Date(m.date)).toISOString())).size;
  const avgCalories = daysLogged > 0 ? meals7d.reduce((s, m) => s + m.totalCalories, 0) / daysLogged : 0;
  const proteinDays = new Set(
    meals7d.filter((m) => m.totalProtein >= proteinTarget).map((m) => startOfDay(new Date(m.date)).toISOString()),
  ).size;

  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const s = startOfDay(d);
    const e = endOfDay(d);
    const hasMeal = await prisma.mealEntry.count({ where: { userId, date: { gte: s, lte: e } } });
    if (hasMeal > 0) streak++;
    else break;
  }

  const mealCounts = { breakfast: 0, lunch: 0, dinner: 0 };
  for (const meal of meals7d) {
    mealCounts[classifyMealType(meal.mealType)] += 1;
  }
  const mostSkippedMeal = (Object.entries(mealCounts).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "breakfast") as
    | "breakfast"
    | "lunch"
    | "dinner";

  const last3Meals = allMeals.slice(0, 3).map((m) => m.mealType || "meal");

  const goalProgressThisWeek =
    calorieTarget > 0
      ? `${Math.round(avgCalories - calorieTarget)}kcal avg`
      : `${Math.round(avgCalories)}kcal avg`;

  return {
    goal: "fat_loss",
    calorie_target: calorieTarget,
    protein_target: proteinTarget,
    streak_days: streak,
    avg_daily_calories_7d: Math.round(avgCalories),
    protein_hit_rate: `${proteinDays}/7 days`,
    most_skipped_meal: mostSkippedMeal,
    last_3_meals: last3Meals,
    goal_progress_this_week: goalProgressThisWeek,
    total_logs: allMeals.length,
    is_premium: user?.plan === "pro",
    coach_questions_used: coachMessages,
    meal_time: mealBucketFromHour(now.getHours()),
    remaining_calories: Math.round(calorieTarget - todayCalories),
    remaining_protein: Math.max(0, Math.round(proteinTarget - todayProtein)),
    current_weight: lastWeight?.weight ?? null,
    activity: "moderate",
  };
}
