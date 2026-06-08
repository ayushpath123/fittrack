import { prisma } from "@/lib/prisma";
import type { TemplateExercise, WorkoutTemplateInput, WorkoutTypeKind } from "@/types/workout";

type BuiltinTemplate = WorkoutTemplateInput & { builtinKey: string; icon: string };

function ex(name: string, sets = 3, reps = "8-12", rest = 90): TemplateExercise {
  return { exerciseName: name, sets, reps, weight: null, rest };
}

const STRENGTH_TEMPLATES: BuiltinTemplate[] = [
  {
    builtinKey: "chest_day",
    name: "Chest Day",
    workoutType: "chest",
    description: "Classic push day targeting chest, front delts, and triceps.",
    icon: "💪",
    colorTheme: "chest",
    intensityLevel: "high",
    category: "strength",
    duration: 45,
    caloriesBurned: 300,
    exercises: [
      ex("Bench Press"),
      ex("Incline Dumbbell Press"),
      ex("Chest Fly"),
      ex("Cable Crossover"),
      ex("Push Ups", 3, "12-15", 60),
    ],
  },
  {
    builtinKey: "shoulder_day",
    name: "Shoulder Day",
    workoutType: "shoulders",
    description: "Build strong, balanced shoulders with compound and isolation work.",
    icon: "🏋️",
    colorTheme: "shoulders",
    intensityLevel: "medium",
    category: "strength",
    duration: 45,
    caloriesBurned: 270,
    exercises: [
      ex("Overhead Press"),
      ex("Lateral Raises", 3, "12-15", 60),
      ex("Front Raises", 3, "12-15", 60),
      ex("Rear Delt Fly", 3, "12-15", 60),
      ex("Shrugs", 3, "10-12"),
    ],
  },
  {
    builtinKey: "arm_day",
    name: "Arm Day",
    workoutType: "arms",
    description: "Biceps and triceps focused session for arm growth.",
    icon: "💪",
    colorTheme: "arms",
    intensityLevel: "medium",
    category: "strength",
    duration: 45,
    caloriesBurned: 250,
    exercises: [
      ex("Barbell Curl"),
      ex("Hammer Curl"),
      ex("Tricep Pushdown"),
      ex("Skull Crusher"),
      ex("Rope Extension", 3, "12-15", 60),
    ],
  },
  {
    builtinKey: "back_day",
    name: "Back Day",
    workoutType: "back",
    description: "Pull day covering lats, rhomboids, and rear delts.",
    icon: "🔥",
    colorTheme: "back",
    intensityLevel: "high",
    category: "strength",
    duration: 45,
    caloriesBurned: 340,
    exercises: [
      ex("Pull Up", 3, "6-10"),
      ex("Lat Pulldown"),
      ex("Seated Row"),
      ex("Deadlift", 4, "5-8", 120),
      ex("Face Pull", 3, "12-15", 60),
    ],
  },
  {
    builtinKey: "leg_day",
    name: "Leg Day",
    workoutType: "legs",
    description: "Full lower body session — quads, hamstrings, and calves.",
    icon: "🦵",
    colorTheme: "legs",
    intensityLevel: "high",
    category: "strength",
    duration: 45,
    caloriesBurned: 425,
    exercises: [
      ex("Squat", 4, "6-10", 120),
      ex("Leg Press"),
      ex("Lunges", 3, "10-12", 90),
      ex("Leg Curl"),
      ex("Calf Raises", 4, "12-15", 60),
    ],
  },
];

const CARDIO_TEMPLATES: BuiltinTemplate[] = [
  {
    builtinKey: "cardio_walking",
    name: "Walking",
    workoutType: "cardio",
    description: "Low-impact cardio for recovery or daily movement.",
    icon: "🚶",
    colorTheme: "cardio",
    intensityLevel: "low",
    category: "cardio",
    duration: 30,
    caloriesBurned: 200,
    exercises: [],
    cardioType: "walking",
    cardioDistance: 3,
    cardioPace: "20 min/km",
  },
  {
    builtinKey: "cardio_running",
    name: "Running",
    workoutType: "cardio",
    description: "Outdoor or track running session.",
    icon: "🏃",
    colorTheme: "cardio",
    intensityLevel: "high",
    category: "cardio",
    duration: 30,
    caloriesBurned: 300,
    exercises: [],
    cardioType: "running",
    cardioDistance: 5,
    cardioPace: "6 min/km",
  },
  {
    builtinKey: "cardio_cycling",
    name: "Cycling",
    workoutType: "cardio",
    description: "Steady-state or interval cycling.",
    icon: "🚴",
    colorTheme: "cardio",
    intensityLevel: "medium",
    category: "cardio",
    duration: 30,
    caloriesBurned: 220,
    exercises: [],
    cardioType: "cycling",
    cardioDistance: 15,
    cardioPace: "25 km/h",
  },
  {
    builtinKey: "cardio_treadmill",
    name: "Treadmill",
    workoutType: "cardio",
    description: "Indoor treadmill cardio session.",
    icon: "🏃‍♂️",
    colorTheme: "cardio",
    intensityLevel: "medium",
    category: "cardio",
    duration: 20,
    caloriesBurned: 200,
    exercises: [],
    cardioType: "treadmill",
    cardioDistance: 4,
    cardioPace: "6.5 min/km",
  },
  {
    builtinKey: "cardio_stair",
    name: "Stair Climber",
    workoutType: "cardio",
    description: "Stair climber machine session.",
    icon: "🪜",
    colorTheme: "cardio",
    intensityLevel: "high",
    category: "cardio",
    duration: 20,
    caloriesBurned: 250,
    exercises: [],
    cardioType: "stair_climber",
  },
  {
    builtinKey: "cardio_elliptical",
    name: "Elliptical",
    workoutType: "cardio",
    description: "Low-impact elliptical cardio.",
    icon: "⚡",
    colorTheme: "cardio",
    intensityLevel: "medium",
    category: "cardio",
    duration: 30,
    caloriesBurned: 280,
    exercises: [],
    cardioType: "elliptical",
  },
  {
    builtinKey: "cardio_rowing",
    name: "Rowing",
    workoutType: "cardio",
    description: "Full-body rowing machine session.",
    icon: "🚣",
    colorTheme: "cardio",
    intensityLevel: "high",
    category: "cardio",
    duration: 25,
    caloriesBurned: 300,
    exercises: [],
    cardioType: "rowing",
    cardioDistance: 5,
    cardioPace: "2:00/500m",
  },
];

export const ALL_BUILTIN_TEMPLATES = [...STRENGTH_TEMPLATES, ...CARDIO_TEMPLATES];

export function getBuiltinTemplateByType(workoutType: WorkoutTypeKind): BuiltinTemplate | undefined {
  return STRENGTH_TEMPLATES.find((t) => t.workoutType === workoutType);
}

/** Seeds built-in templates; syncs duration and calories with canonical defaults. */
export async function ensureDefaultWorkoutTemplates(userId: string): Promise<void> {
  for (const template of ALL_BUILTIN_TEMPLATES) {
    const { builtinKey, exercises, ...rest } = template;
    await prisma.workoutTemplate.upsert({
      where: { userId_builtinKey: { userId, builtinKey } },
      create: {
        userId,
        builtinKey,
        exercises: exercises as object,
        ...rest,
      },
      update: {
        duration: rest.duration,
        caloriesBurned: rest.caloriesBurned,
      },
    });
  }
}
