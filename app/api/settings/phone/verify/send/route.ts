import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { issueOtp, normalizePhone, OtpThrottleError } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json()) as { phone?: string };
    if (!body.phone) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }
    const phone = normalizePhone(body.phone);

    const result = await issueOtp(phone, "signup");
    return NextResponse.json({
      message: "Verification OTP sent.",
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof OtpThrottleError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429 },
      );
    }
    const twilioCode = (error as { code?: number } | null)?.code;
    if (twilioCode === 21608) {
      return NextResponse.json(
        {
          error:
            "Twilio trial account can only send SMS to verified numbers. Verify this recipient number in Twilio console first.",
        },
        { status: 400 },
      );
    }
    console.error("[settings phone verify send]", error);
    return NextResponse.json({ error: "Unable to send OTP." }, { status: 500 });
  }
}
