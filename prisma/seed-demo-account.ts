/**
 * Seeds 60 days of meals, weight, hydration, and workouts for the demo account.
 * Safe to re-run — only clears tracking data for test@fittrack.com.
 *
 * Usage: npm run db:seed-demo
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { calculateMealTotals } from "../lib/calculations";
import type { FoodItemType, MealItem } from "../types";

const prisma = new PrismaClient();

const DEMO_EMAIL = "test@fittrack.com";
const DEMO_PASSWORD = "Ayush@123";
const SEED_DAYS = 60;

const FOOD_CATALOG = [
  { name: "Milk", baseQuantity: "450 ml", baseWeightGrams: 450, calories: 315, protein: 30, carbs: 24, fat: 11, price: 45 },
  { name: "Oats", baseQuantity: "50 g", baseWeightGrams: 50, calories: 196, protein: 13.5, carbs: 34, fat: 4, price: 25 },
  { name: "Mixed Seeds", baseQuantity: "20 g", baseWeightGrams: 20, calories: 120, protein: 6, carbs: 4, fat: 9, price: 10 },
  { name: "Roti", baseQuantity: "1 piece", baseWeightGrams: 40, calories: 100, protein: 3, carbs: 18, fat: 1.5, price: 5 },
  { name: "Dal", baseQuantity: "150 g", baseWeightGrams: 150, calories: 170, protein: 9, carbs: 24, fat: 3, price: 20 },
  { name: "Sabji", baseQuantity: "200 g", baseWeightGrams: 200, calories: 100, protein: 3, carbs: 12, fat: 4, price: 20 },
  { name: "Soy Chunks", baseQuantity: "60 g", baseWeightGrams: 60, calories: 207, protein: 31, carbs: 14, fat: 1.5, price: 8 },
  { name: "Paneer", baseQuantity: "100 g", baseWeightGrams: 100, calories: 190, protein: 25, carbs: 6, fat: 20, price: 50 },
  { name: "Cooked Rice", baseQuantity: "100 g", baseWeightGrams: 100, calories: 130, protein: 2.5, carbs: 28, fat: 0.3, price: 6 },
  { name: "Dahi", baseQuantity: "200 g", baseWeightGrams: 200, calories: 154, protein: 15, carbs: 10, fat: 8, price: 35 },
  { name: "Fruit (Medium)", baseQuantity: "1 piece", baseWeightGrams: 120, calories: 60, protein: 1, carbs: 15, fat: 0.2, price: 10 },
  { name: "Ghee", baseQuantity: "5 ml", baseWeightGrams: 5, calories: 45, protein: 0, carbs: 0, fat: 5, price: 5 },
] as const;

const WORKOUT_ROTATION = [
  { name: "Push Day", type: "chest", duration: 52, calories: 320 },
  { name: "Pull Day", type: "back", duration: 48, calories: 290 },
  { name: "Leg Day", type: "legs", duration: 55, calories: 380 },
  { name: "Upper Body", type: "full_body", duration: 45, calories: 270 },
] as const;

function dayAt(daysAgo: number, hour: number, minute = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateOnly(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function ensureFoodCatalog() {
  const count = await prisma.foodItem.count();
  if (count > 0) return prisma.foodItem.findMany();
  await prisma.foodItem.createMany({ data: [...FOOD_CATALOG] });
  return prisma.foodItem.findMany();
}

async function ensureDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await hash(DEMO_PASSWORD, 10),
      emailVerified: new Date(),
    },
  });
}

async function clearDemoTracking(userId: string) {
  await prisma.$executeRaw`
    DELETE FROM "ExerciseEntry"
    WHERE "workoutId" IN (SELECT id FROM "Workout" WHERE "userId" = ${userId})
  `;
  await prisma.workout.deleteMany({ where: { userId } });
  await prisma.mealEntry.deleteMany({ where: { userId } });
  await prisma.weightLog.deleteMany({ where: { userId } });
  await prisma.hydrationLog.deleteMany({ where: { userId } });
  await prisma.workoutLog.deleteMany({ where: { userId } });
  await prisma.dailyActivityLog.deleteMany({ where: { userId } });
}

async function main() {
  console.log("Seeding demo account…");
  const foods = await ensureFoodCatalog();
  const byName = new Map(foods.map((f) => [f.name, f]));
  const foodById = new Map(foods.map((f) => [f.id, f as unknown as FoodItemType]));

  const milk = byName.get("Milk")!;
  const oats = byName.get("Oats")!;
  const seeds = byName.get("Mixed Seeds")!;
  const dahi = byName.get("Dahi")!;
  const fruit = byName.get("Fruit (Medium)")!;
  const soy = byName.get("Soy Chunks")!;
  const paneer = byName.get("Paneer")!;
  const rice = byName.get("Cooked Rice")!;
  const dal = byName.get("Dal")!;
  const sabji = byName.get("Sabji")!;
  const ghee = byName.get("Ghee")!;

  function totalsFor(items: { foodId: string; multiplier?: number }[]) {
    const mealItems: MealItem[] = items.map((x) => ({ foodId: x.foodId, multiplier: x.multiplier }));
    const foodsArr = mealItems.map((i) => foodById.get(i.foodId)).filter(Boolean) as FoodItemType[];
    return calculateMealTotals(foodsArr, mealItems);
  }

  const user = await ensureDemoUser();
  console.log(`User: ${user.email}`);

  await prisma.goalSetting.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      calorieTarget: 1850,
      proteinTarget: 130,
      carbTarget: 200,
      fatTarget: 60,
      waterTargetMl: 2200,
    },
    update: {},
  });

  await clearDemoTracking(user.id);

  const mealRows: Prisma.MealEntryCreateManyInput[] = [];
  const weightRows: Prisma.WeightLogCreateManyInput[] = [];
  const hydrationRows: Prisma.HydrationLogCreateManyInput[] = [];
  const workoutLogRows: Prisma.WorkoutLogCreateManyInput[] = [];
  const activityRows: Prisma.DailyActivityLogCreateManyInput[] = [];
  const legacyWorkouts: Array<{
    date: Date;
    caloriesBurned: number;
    exercises: { name: string; sets: number; reps: number; weight: number }[];
  }> = [];

  let workoutRotationIdx = 0;

  for (let i = 0; i < SEED_DAYS; i++) {
    const dow = dateOnly(i).getDay();
    const progressBlock = Math.floor((SEED_DAYS - i) / 14);
    const isWorkoutDay = [1, 2, 4, 6].includes(dow);
    const skipSnack = i % 11 === 0;

    const breakfastMultiplier = i % 6 === 0 ? 1.15 : i % 5 === 0 ? 0.88 : 1;
    const lunchMultiplier = i % 7 === 0 ? 1.12 : i % 8 === 0 ? 0.9 : 1;
    const dinnerMultiplier = i % 9 === 0 ? 1.2 : i % 4 === 0 ? 0.92 : 1;

    const breakfastItems = [
      { foodId: milk.id, multiplier: breakfastMultiplier },
      { foodId: oats.id, multiplier: breakfastMultiplier },
      { foodId: seeds.id, multiplier: 1 },
    ];
    const lunchItems = [
      { foodId: rice.id, multiplier: lunchMultiplier },
      { foodId: dal.id, multiplier: lunchMultiplier },
      { foodId: sabji.id, multiplier: 1 },
      { foodId: ghee.id, multiplier: 1 },
    ];
    const preItems = [
      { foodId: dahi.id, multiplier: 1 },
      { foodId: fruit.id, multiplier: 1 },
    ];
    const dinnerItems = [
      { foodId: soy.id, multiplier: dinnerMultiplier },
      { foodId: paneer.id, multiplier: dinnerMultiplier },
      { foodId: rice.id, multiplier: dinnerMultiplier * 0.85 },
      { foodId: sabji.id, multiplier: 1 },
      { foodId: ghee.id, multiplier: 1 },
    ];
    const snackItems = [
      { foodId: dahi.id, multiplier: i % 3 === 0 ? 1.1 : 0.95 },
      { foodId: fruit.id, multiplier: 1 },
    ];

    const meals: Array<{
      mealType: string;
      when: Date;
      items: { foodId: string; multiplier?: number }[];
    }> = [
      { mealType: "Breakfast", when: dayAt(i, 8, 15), items: breakfastItems },
      { mealType: "Lunch", when: dayAt(i, 13, 30), items: lunchItems },
      { mealType: "Dinner", when: dayAt(i, 20, 0), items: dinnerItems },
    ];
    if (isWorkoutDay) meals.push({ mealType: "Pre-Workout", when: dayAt(i, 16, 45), items: preItems });
    if (!skipSnack) meals.push({ mealType: "Snack", when: dayAt(i, 22, 0), items: snackItems });

    for (const meal of meals) {
      const t = totalsFor(meal.items);
      mealRows.push({
        userId: user.id,
        date: meal.when,
        mealType: meal.mealType,
        items: meal.items as unknown as Prisma.JsonArray,
        totalCalories: t.totalCalories,
        totalProtein: t.totalProtein,
        totalCarbs: t.totalCarbs,
        totalFat: t.totalFat,
      });
    }

    const downwardTrend = 73.0 + i * 0.035;
    const weeklyCycle = Math.sin((i / 7) * Math.PI * 2) * 0.3;
    const dailyNoise = ((i % 5) - 2) * 0.06;
    const weight = Math.round((downwardTrend + weeklyCycle + dailyNoise) * 10) / 10;
    const waistCm = Math.round((88 - i * 0.04 + weeklyCycle * 0.5) * 10) / 10;

    weightRows.push({ userId: user.id, date: dateOnly(i), weight, waistCm });

    const hydrationMl = 1950 + (i % 7) * 80 + (isWorkoutDay ? 250 : 0) + (i % 4 === 0 ? -180 : 0);
    hydrationRows.push({ userId: user.id, date: dateOnly(i), totalMl: hydrationMl });

    let workoutLogged = false;
    if (isWorkoutDay) {
      const rotation = WORKOUT_ROTATION[workoutRotationIdx % WORKOUT_ROTATION.length]!;
      workoutRotationIdx += 1;
      workoutLogged = true;

      workoutLogRows.push({
        userId: user.id,
        workoutName: rotation.name,
        workoutType: rotation.type,
        duration: rotation.duration + (i % 3) * 3,
        caloriesBurned: rotation.calories + progressBlock * 8,
        workoutDate: dayAt(i, 18, 0),
      });

      const split = rotation.type;
      const exercises =
        split === "chest"
          ? [
              { name: "Bench Press", sets: 4, reps: 8, weight: 50 + progressBlock * 2.5 },
              { name: "OHP", sets: 4, reps: 6, weight: 32.5 + progressBlock * 1.5 },
              { name: "Incline DB Press", sets: 3, reps: 10, weight: 18 + progressBlock },
              { name: "Lateral Raise", sets: 3, reps: 15, weight: 7.5 + progressBlock * 0.5 },
            ]
          : split === "back"
            ? [
                { name: "Deadlift", sets: 3, reps: 5, weight: 85 + progressBlock * 5 },
                { name: "Barbell Row", sets: 4, reps: 8, weight: 47.5 + progressBlock * 2.5 },
                { name: "Lat Pulldown", sets: 3, reps: 10, weight: 42 + progressBlock * 2 },
                { name: "Face Pull", sets: 3, reps: 15, weight: 16 + progressBlock },
              ]
            : split === "legs"
              ? [
                  { name: "Squat", sets: 4, reps: 6, weight: 65 + progressBlock * 3 },
                  { name: "RDL", sets: 4, reps: 8, weight: 55 + progressBlock * 2.5 },
                  { name: "Leg Press", sets: 3, reps: 12, weight: 130 + progressBlock * 5 },
                  { name: "Calf Raise", sets: 4, reps: 15, weight: 45 + progressBlock * 2 },
                ]
              : [
                  { name: "Bench Press", sets: 3, reps: 8, weight: 47.5 + progressBlock * 2 },
                  { name: "Pull-up", sets: 4, reps: 8, weight: 0 },
                  { name: "Squat", sets: 3, reps: 8, weight: 60 + progressBlock * 2.5 },
                  { name: "OHP", sets: 3, reps: 8, weight: 30 + progressBlock * 1.5 },
                ];

      legacyWorkouts.push({
        date: dayAt(i, 18, 0),
        caloriesBurned: rotation.calories,
        exercises,
      });
    }

    activityRows.push({
      userId: user.id,
      date: dateOnly(i),
      mealsLogged: true,
      workoutLogged,
      hydrationLogged: hydrationMl >= 2200,
    });
  }

  console.log(`Inserting ${mealRows.length} meals…`);
  await prisma.$transaction([
    prisma.mealEntry.createMany({ data: mealRows }),
    prisma.weightLog.createMany({ data: weightRows, skipDuplicates: true }),
    prisma.hydrationLog.createMany({ data: hydrationRows, skipDuplicates: true }),
    prisma.workoutLog.createMany({ data: workoutLogRows }),
    prisma.dailyActivityLog.createMany({ data: activityRows, skipDuplicates: true }),
  ]);

  console.log(`Inserting ${legacyWorkouts.length} legacy workouts…`);
  for (const w of legacyWorkouts) {
    await prisma.workout.create({
      data: {
        userId: user.id,
        date: w.date,
        completed: true,
        caloriesBurned: w.caloriesBurned,
        exercises: { create: w.exercises },
      },
    });
  }

  console.log(`Demo seed complete for ${DEMO_EMAIL}`);
  console.log(`  ${SEED_DAYS} days · ${mealRows.length} meals · ${weightRows.length} weight logs`);
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
