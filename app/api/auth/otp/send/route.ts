import { NextResponse } from "next/server";
import { issueOtp, OtpThrottleError } from "@/lib/otp";
import { checkOtpIpRateLimit, getClientIp } from "@/lib/security/ipRateLimit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const ipCheck = await checkOtpIpRateLimit(ip);
    if (!ipCheck.ok) {
      return NextResponse.json(
        {
          error: "Too many OTP requests from this network. Please try again shortly.",
          retryAfterSeconds: ipCheck.retryAfterSec,
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { phone?: string; purpose?: "login" | "signup" };
    if (!body.phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    const purpose = body.purpose === "signup" ? "signup" : "login";
    const result = await issueOtp(body.phone, purpose);
    return NextResponse.json({
      message: "OTP sent successfully.",
      ...result,
    });
  } catch (error) {
    if (error instanceof OtpThrottleError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const twilioCode = (error as { code?: number } | null)?.code;
    if (twilioCode === 21608) {
      return NextResponse.json(
        {
          error:
            "Twilio trial account can only send SMS to verified numbers. Verify this recipient number in Twilio console first.",
        },
        { status: 400 }
      );
    }

    console.error("[OTP_SEND_ERROR]", error);
    return NextResponse.json({ error: "Unable to send OTP." }, { status: 500 });
  }
}
