import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { applyCorrection } from "@/lib/voice/correctionEngine";

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("remove"), targetLabel: z.string().min(1) }),
  z.object({
    type: z.literal("replace"),
    targetLabel: z.string().min(1),
    replacement: z.string().min(1),
  }),
  z.object({ type: z.literal("update_hydration"), amountMl: z.number().min(0) }),
]);

const bodySchema = z.object({
  action: actionSchema,
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, email: true, subscriptionStatus: true },
    });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }

    const { action, date } = bodySchema.parse(await req.json());
    const result = await applyCorrection(userId, action, date);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Correction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
