import twilio from "twilio";

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export async function sendSmsOtp(phone: string, code: string) {
  const config = getTwilioConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV_SMS_OTP] phone=${phone} code=${code}`);
      return;
    }
    throw new Error("Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.");
  }

  const client = twilio(config.accountSid, config.authToken);
  await client.messages.create({
    from: config.from,
    to: phone,
    body: `Your FitTrack OTP is ${code}. It expires in 10 minutes.`,
  });
}
