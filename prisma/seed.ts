import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { calculateMealTotals } from "../lib/calculations";
import type { FoodItemType, MealItem } from "../types";

const prisma = new PrismaClient();

async function main() {
  await prisma.exerciseEntry.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.mealEntry.deleteMany();
  await prisma.hydrationLog.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.goalSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.mealTemplate.deleteMany();
  await prisma.foodItem.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "demo@fittrack.app",
      phone: "+919316568042",
      phoneVerified: new Date(),
      passwordHash: await hash("password123", 10),
      emailVerified: new Date(),
    } as Prisma.UserUncheckedCreateInput,
  });
  await prisma.goalSetting.create({
    data: {
      userId: user.id,
      calorieTarget: 1500,
      proteinTarget: 110,
      carbTarget: 180,
      fatTarget: 55,
    },
  });

  await prisma.foodItem.createMany({
    data: [
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
    ],
  });

  const milk = await prisma.foodItem.findFirst({ where: { name: "Milk" } });
  const oats = await prisma.foodItem.findFirst({ where: { name: "Oats" } });
  const seeds = await prisma.foodItem.findFirst({ where: { name: "Mixed Seeds" } });
  const dahi = await prisma.foodItem.findFirst({ where: { name: "Dahi" } });
  const fruit = await prisma.foodItem.findFirst({ where: { name: "Fruit (Medium)" } });
  const soy = await prisma.foodItem.findFirst({ where: { name: "Soy Chunks" } });
  const paneer = await prisma.foodItem.findFirst({ where: { name: "Paneer" } });
  const rice = await prisma.foodItem.findFirst({ where: { name: "Cooked Rice" } });
  const dal = await prisma.foodItem.findFirst({ where: { name: "Dal" } });
  const sabji = await prisma.foodItem.findFirst({ where: { name: "Sabji" } });
  const ghee = await prisma.foodItem.findFirst({ where: { name: "Ghee" } });

  await prisma.mealTemplate.createMany({
    data: [
      {
        userId: user.id,
        name: "Breakfast",
        mealType: "Breakfast",
        items: [
          { foodId: milk!.id, quantityMultiplier: 1 },
          { foodId: oats!.id, quantityMultiplier: 1 },
          { foodId: seeds!.id, quantityMultiplier: 1 },
        ],
      },
      {
        userId: user.id,
        name: "Pre-Workout",
        mealType: "Pre-Workout",
        items: [
          { foodId: dahi!.id, quantityMultiplier: 1 },
          { foodId: fruit!.id, quantityMultiplier: 1 },
        ],
      },
      {
        userId: user.id,
        name: "Dinner",
        mealType: "Dinner",
        items: [
          { foodId: soy!.id, quantityMultiplier: 1 },
          { foodId: paneer!.id, quantityMultiplier: 1 },
          { foodId: rice!.id, quantityMultiplier: 1 },
          { foodId: sabji!.id, quantityMultiplier: 1 },
          { foodId: ghee!.id, quantityMultiplier: 1 },
        ],
      },
    ],
  });

  const allFoods = await prisma.foodItem.findMany();
  const foodById = new Map(allFoods.map((f) => [f.id, f as unknown as FoodItemType]));

  function totalsFor(items: { foodId: string; multiplier?: number; grams?: number }[]) {
    const mealItems: MealItem[] = items.map((x) => ({
      foodId: x.foodId,
      multiplier: x.multiplier,
      grams: x.grams,
    }));
    const foodsArr = mealItems.map((i) => foodById.get(i.foodId)).filter(Boolean) as FoodItemType[];
    return calculateMealTotals(foodsArr, mealItems);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const progressBlock = Math.floor((90 - i) / 14);

    const breakfastMultiplier = i % 6 === 0 ? 1.2 : i % 5 === 0 ? 0.85 : 1;
    const lunchMultiplier = i % 7 === 0 ? 1.15 : 1;
    const dinnerMultiplier = i % 9 === 0 ? 1.25 : i % 4 === 0 ? 0.9 : 1;
    const snackMultiplier = i % 3 === 0 ? 1.1 : 0.9;

    const breakfastItems = [
      { foodId: milk!.id, multiplier: breakfastMultiplier },
      { foodId: oats!.id, multiplier: breakfastMultiplier },
      { foodId: seeds!.id, multiplier: 1 },
    ];
    const lunchItems = [
      { foodId: rice!.id, multiplier: 1 },
      { foodId: dal!.id, multiplier: lunchMultiplier },
      { foodId: sabji!.id, multiplier: 1 },
      { foodId: ghee!.id, multiplier: 1 },
    ];
    const preItems = [
      { foodId: dahi!.id, multiplier: 1 },
      { foodId: fruit!.id, multiplier: 1 },
    ];
    const dinnerItems = [
      { foodId: soy!.id, multiplier: dinnerMultiplier },
      { foodId: paneer!.id, multiplier: dinnerMultiplier },
      { foodId: rice!.id, multiplier: dinnerMultiplier },
      { foodId: sabji!.id, multiplier: 1 },
      { foodId: ghee!.id, multiplier: 1 },
    ];
    const snackItems = [
      { foodId: dahi!.id, multiplier: snackMultiplier },
      { foodId: fruit!.id, multiplier: snackMultiplier },
    ];

    const bt = totalsFor(breakfastItems);
    const lt = totalsFor(lunchItems);
    const pt = totalsFor(preItems);
    const dt = totalsFor(dinnerItems);
    const st = totalsFor(snackItems);

    await prisma.mealEntry.create({
      data: {
        userId: user.id,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0),
        mealType: "Breakfast",
        items: breakfastItems as unknown as Prisma.JsonArray,
        totalCalories: bt.totalCalories,
        totalProtein: bt.totalProtein,
        totalCarbs: bt.totalCarbs,
        totalFat: bt.totalFat,
      },
    });

    await prisma.mealEntry.create({
      data: {
        userId: user.id,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13, 30, 0),
        mealType: "Lunch",
        items: lunchItems as unknown as Prisma.JsonArray,
        totalCalories: lt.totalCalories,
        totalProtein: lt.totalProtein,
        totalCarbs: lt.totalCarbs,
        totalFat: lt.totalFat,
      },
    });

    const isWorkoutDay = [1, 2, 4, 6].includes(dow);
    if (isWorkoutDay) {
      await prisma.mealEntry.create({
        data: {
          userId: user.id,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 16, 30, 0),
          mealType: "Pre-Workout",
          items: preItems as unknown as Prisma.JsonArray,
          totalCalories: pt.totalCalories,
          totalProtein: pt.totalProtein,
          totalCarbs: pt.totalCarbs,
          totalFat: pt.totalFat,
        },
      });
    }

    await prisma.mealEntry.create({
      data: {
        userId: user.id,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 20, 15, 0),
        mealType: "Dinner",
        items: dinnerItems as unknown as Prisma.JsonArray,
        totalCalories: dt.totalCalories,
        totalProtein: dt.totalProtein,
        totalCarbs: dt.totalCarbs,
        totalFat: dt.totalFat,
      },
    });

    await prisma.mealEntry.create({
      data: {
        userId: user.id,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0, 0),
        mealType: "Snack",
        items: snackItems as unknown as Prisma.JsonArray,
        totalCalories: st.totalCalories,
        totalProtein: st.totalProtein,
        totalCarbs: st.totalCarbs,
        totalFat: st.totalFat,
      },
    });

    if (isWorkoutDay) {
      const split = dow === 1 ? "Push" : dow === 2 ? "Pull" : dow === 4 ? "Legs" : "Upper";
      const exercises =
        split === "Push"
          ? [
              { name: "Bench Press", sets: 4, reps: 8, weight: 52.5 + progressBlock * 2.5 },
              { name: "OHP", sets: 4, reps: 6, weight: 35 + progressBlock * 1.5 },
              { name: "Incline DB Press", sets: 3, reps: 10, weight: 20 + progressBlock * 1 },
              { name: "Lateral Raise", sets: 3, reps: 15, weight: 8 + progressBlock * 0.5 },
              { name: "Tricep Pushdown", sets: 3, reps: 12, weight: 20 + progressBlock * 1 },
            ]
          : split === "Pull"
            ? [
                { name: "Deadlift", sets: 3, reps: 5, weight: 90 + progressBlock * 5 },
                { name: "Barbell Row", sets: 4, reps: 8, weight: 50 + progressBlock * 2.5 },
                { name: "Lat Pulldown", sets: 3, reps: 10, weight: 45 + progressBlock * 2 },
                { name: "Face Pull", sets: 3, reps: 15, weight: 18 + progressBlock * 1 },
                { name: "Bicep Curl", sets: 3, reps: 12, weight: 12 + progressBlock * 0.5 },
              ]
            : split === "Legs"
              ? [
                  { name: "Squat", sets: 4, reps: 6, weight: 70 + progressBlock * 3 },
                  { name: "RDL", sets: 4, reps: 8, weight: 60 + progressBlock * 2.5 },
                  { name: "Leg Press", sets: 3, reps: 12, weight: 140 + progressBlock * 5 },
                  { name: "Walking Lunge", sets: 3, reps: 12, weight: 16 + progressBlock * 1 },
                  { name: "Calf Raise", sets: 4, reps: 15, weight: 50 + progressBlock * 2 },
                ]
              : [
                  { name: "Bench Press", sets: 3, reps: 8, weight: 50 + progressBlock * 2 },
                  { name: "Pull-up", sets: 4, reps: 8, weight: 0 },
                  { name: "Squat", sets: 3, reps: 8, weight: 65 + progressBlock * 2.5 },
                  { name: "OHP", sets: 3, reps: 8, weight: 32.5 + progressBlock * 1.5 },
                  { name: "Barbell Row", sets: 3, reps: 10, weight: 45 + progressBlock * 2 },
                ];

      await prisma.workout.create({
        data: {
          userId: user.id,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0),
          completed: true,
          exercises: { create: exercises },
        },
      });
    }

    const downwardTrend = 74.5 - i * 0.018;
    const weeklyCycle = Math.sin((i / 7) * Math.PI * 2) * 0.25;
    const dailyNoise = ((i % 5) - 2) * 0.05;
    const weight = Math.round((downwardTrend + weeklyCycle + dailyNoise) * 10) / 10;
    await prisma.weightLog.create({ data: { userId: user.id, date: d, weight } });
  }

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
