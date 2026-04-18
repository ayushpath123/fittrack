import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendSmsOtp } from "@/lib/sms";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_DAILY_LIMIT = 10;
const OTP_MAX_ATTEMPTS = 5;

export class OtpThrottleError extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "OtpThrottleError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function normalizePhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) throw new Error("Phone number must include country code");
  if (cleaned.length < 10 || cleaned.length > 16) throw new Error("Invalid phone number");
  return cleaned;
}

function generateOtpCode() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}

export async function issueOtp(phoneRaw: string, purpose: "login" | "signup") {
  const phone = normalizePhone(phoneRaw);
  const now = new Date();

  const latestOtp = await prisma.otpCode.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latestOtp) {
    const elapsedSeconds = Math.floor((now.getTime() - latestOtp.createdAt.getTime()) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new OtpThrottleError("Please wait before requesting another OTP.", OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
    }
  }

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.otpCode.count({
    where: {
      phone,
      purpose,
      createdAt: { gte: dayStart },
    },
  });
  if (sentToday >= OTP_DAILY_LIMIT) {
    throw new OtpThrottleError("Daily OTP limit reached. Please try again tomorrow.");
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60_000);

  // Send SMS before mutating OTP records so provider failures do not consume cooldown/quota state.
  await sendSmsOtp(phone, code);

  await prisma.otpCode.updateMany({
    where: { phone, purpose, usedAt: null },
    data: { usedAt: now },
  });

  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash,
      expiresAt,
    },
  });

  return {
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    devCode:
      process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP_CODE === "true" ? code : undefined,
  };
}

export async function verifyOtp(phoneRaw: string, code: string, purpose: "login" | "signup") {
  const phone = normalizePhone(phoneRaw);
  const now = new Date();
  const codeHash = hashOtp(code.trim());

  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      purpose,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: now },
    });
    return false;
  }

  if (otp.codeHash !== codeHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: {
        attempts: { increment: 1 },
        ...(otp.attempts + 1 >= OTP_MAX_ATTEMPTS ? { usedAt: now } : {}),
      },
    });
    return false;
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { usedAt: now },
  });
  return true;
}
