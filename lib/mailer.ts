import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  return { host, port, secure, user, pass, from };
}

async function sendMail(to: string, subject: string, html: string) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await sendMail(
    to,
    "Verify your FitTrack email",
    `<p>Welcome to FitTrack.</p>
     <p>Please verify your email by clicking this link:</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

export async function sendResetPasswordEmail(to: string, resetUrl: string) {
  await sendMail(
    to,
    "Reset your FitTrack password",
    `<p>We received a request to reset your FitTrack password.</p>
     <p>Use this link to reset it:</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`
  );
}
