export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const revalidate = 86400;

export async function GET(req: Request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? 50);
  const limit = Math.max(10, Math.min(100, Number.isFinite(limitParam) ? limitParam : 50));
  const cursor = searchParams.get("cursor");

  if (q || cursor || searchParams.has("limit")) {
    const foods = await prisma.foodItem.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      select: {
        id: true,
        name: true,
        baseQuantity: true,
        baseWeightGrams: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        price: true,
        barcode: true,
      },
    });
    const hasMore = foods.length > limit;
    const pageFoods = hasMore ? foods.slice(0, limit) : foods;
    const nextCursor = hasMore ? pageFoods[pageFoods.length - 1]?.id ?? null : null;
    return NextResponse.json({ foods: pageFoods, nextCursor });
  }

  const [foods, templates] = await Promise.all([
    prisma.foodItem.findMany({ orderBy: { name: "asc" } }),
    prisma.mealTemplate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ foods, templates });
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as {
      name?: string;
      mealType?: string;
      items?: { foodId: string; quantityMultiplier: number }[];
    };

    const name = body.name?.trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Template name is required." }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "Select at least one item." }, { status: 400 });
    }

    const cleaned = items
      .filter((i) => typeof i.foodId === "string" && i.foodId.length > 0 && Number.isFinite(i.quantityMultiplier) && i.quantityMultiplier > 0)
      .map((i) => ({
        foodId: i.foodId,
        quantityMultiplier: Math.round(i.quantityMultiplier * 1000) / 1000,
      }));

    if (cleaned.length === 0) {
      return NextResponse.json({ error: "Invalid template items." }, { status: 400 });
    }

    const created = await prisma.mealTemplate.create({
      data: {
        name,
        userId,
        mealType: body.mealType?.trim() || null,
        items: cleaned,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save template." }, { status: 500 });
  }
}
