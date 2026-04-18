export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { barcodeImportSchema } from "@/lib/validators";
import { fetchOpenFoodFactsProduct, normalizeBarcodeInput } from "@/lib/openFoodFacts";
import type { FoodItemType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = barcodeImportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const barcode = normalizeBarcodeInput(parsed.data.code);
  const shouldSave = parsed.data.save === true;
  if (!barcode) {
    return NextResponse.json({ error: "Enter a valid 8–14 digit barcode." }, { status: 400 });
  }

  const existing = await prisma.foodItem.findUnique({ where: { barcode } });
  if (existing) {
    if (shouldSave) return NextResponse.json(existing as unknown as FoodItemType);
    return NextResponse.json({ exists: true, food: existing as unknown as FoodItemType });
  }

  const off = await fetchOpenFoodFactsProduct(barcode);
  if (!off) {
    return NextResponse.json(
      { error: "Product not found or nutrition per 100g is missing in Open Food Facts." },
      { status: 404 },
    );
  }

  if (!shouldSave) {
    return NextResponse.json({
      exists: false,
      product: {
        name: off.name.slice(0, 200),
        baseQuantity: off.baseQuantity,
        baseWeightGrams: off.baseWeightGrams,
        calories: off.calories,
        protein: off.protein,
        carbs: off.carbs,
        fat: off.fat,
        barcode: off.barcode,
      },
    });
  }

  try {
    const created = await prisma.foodItem.create({
      data: {
        name: off.name.slice(0, 200),
        baseQuantity: off.baseQuantity,
        baseWeightGrams: off.baseWeightGrams,
        calories: off.calories,
        protein: off.protein,
        carbs: off.carbs,
        fat: off.fat,
        price: 0,
        barcode: off.barcode,
      },
    });
    return NextResponse.json(created as unknown as FoodItemType);
  } catch (e) {
    const existingAfter = await prisma.foodItem.findUnique({ where: { barcode } });
    if (existingAfter) return NextResponse.json(existingAfter as unknown as FoodItemType);
    console.error("food from-barcode create", e);
    return NextResponse.json({ error: "Could not save food item." }, { status: 500 });
  }
}
