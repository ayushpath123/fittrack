import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay, toLocalDateKey } from "@/lib/date";
import { requireUserId } from "@/lib/auth";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const userId = await requireUserId();
  const { date: dateParam } = await params;
  const date = new Date(`${dateParam}T12:00:00`);
  const dayKey = dateParam.slice(0, 10);
  const isToday = dayKey === toLocalDateKey(new Date());
  const [meals, workout, weight, goals] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } } }),
    prisma.workout.findFirst({
      where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } },
      include: { exercises: true },
    }),
    prisma.weightLog.findFirst({ where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
  ]);
  const calorieTarget = goals?.calorieTarget ?? 1500;

  const totalCal = meals.reduce((s, m) => s + m.totalCalories, 0);
  const totalProt = meals.reduce((s, m) => s + m.totalProtein, 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.totalCarbs ?? 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.totalFat ?? 0), 0);

  return (
    <div className="space-y-4">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#BEFF47] dark:text-[#B8E86A] hover:underline"
      >
        <ChevronLeft size={18} aria-hidden />
        Back to calendar
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{date.toDateString()}</h1>
      {isToday && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/meals?action=log"
            className="rounded-xl bg-[#BEFF47] px-3 py-2 text-xs font-semibold text-[#06080A] transition-transform active:scale-[0.98] hover:bg-[#CCFF5A]"
          >
            Log meal
          </Link>
          <Link
            href="/weight?action=log"
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-200 text-xs font-semibold active:scale-[0.98] transition-transform"
          >
            Log weight
          </Link>
          <Link
            href="/workout?action=start"
            className="px-3 py-2 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300 text-xs font-semibold active:scale-[0.98] transition-transform"
          >
            Workout
          </Link>
        </div>
      )}

      <div className="premium-card rounded-2xl p-4">
        <p className="text-sm font-semibold mb-2 text-gray-800 dark:text-slate-100">Nutrition</p>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          {Math.round(totalCal)} kcal · {Math.round(totalProt)}g protein · {Math.round(totalCarbs)}g carbs · {Math.round(totalFat)}g fat
        </p>
        {meals.length > 0 && (
          <p
            className={`text-xs font-medium mt-2 ${totalCal <= calorieTarget ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {totalCal <= calorieTarget ? "At or under" : "Over"} calorie target ({calorieTarget} kcal)
          </p>
        )}
        {meals.map((m) => (
          <div key={m.id} className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
            <span>{m.mealType}</span>
            <span>{Math.round(m.totalCalories)} kcal</span>
          </div>
        ))}
      </div>

      {workout && (
        <div className="premium-card rounded-2xl p-4">
          <p className="text-sm font-semibold mb-2 text-gray-800 dark:text-slate-100">Workout {workout.completed ? "Done" : ""}</p>
          {workout.exercises.map((ex) => (
            <p key={ex.id} className="text-xs text-gray-500 dark:text-slate-400">
              {ex.name} - {ex.sets}x{ex.reps} @ {ex.weight}kg
            </p>
          ))}
        </div>
      )}

      {weight && (
        <div className="premium-card rounded-2xl p-4">
          <p className="text-sm font-semibold mb-1 text-gray-800 dark:text-slate-100">Weight</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {weight.weight} <span className="text-sm font-normal text-gray-500 dark:text-slate-400">kg</span>
          </p>
          {weight.waistCm != null && weight.waistCm > 0 && (
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Waist {weight.waistCm} <span className="text-gray-500 dark:text-slate-500">cm</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
