import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — FitTrack",
  description: "What data FitTrack collects, how it is used, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <LegalSection title="1. What we collect">
        <ul>
          <li>
            <strong>Account data:</strong> email address, password (stored as a salted hash), and optionally your
            phone number (required for subscription checkout, verified by OTP).
          </li>
          <li>
            <strong>Health and activity data you log:</strong> meals, nutrition figures, workouts, weight, water
            intake, goals, streaks, and similar entries.
          </li>
          <li>
            <strong>AI inputs:</strong> meal photos, voice clips, and coach messages you choose to submit for AI
            processing.
          </li>
          <li>
            <strong>Payment data:</strong> subscription status and identifiers from our payment partner. We never see
            or store your full card, bank, or UPI credentials — Razorpay handles those.
          </li>
          <li>
            <strong>Technical data:</strong> session cookies needed to keep you signed in, and basic logs for
            security and debugging.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use it">
        <ul>
          <li>To provide the Service: tracking, charts, insights, reminders, and leaderboards.</li>
          <li>To run AI features you invoke (photo estimates, coach, voice logging).</li>
          <li>To process subscription payments and manage your plan.</li>
          <li>To send transactional messages: email verification, password resets, and OTP texts.</li>
          <li>We do not sell your personal data, and we do not use your health data for advertising.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Processors we share data with">
        <p>We share only what each provider needs to do its job:</p>
        <ul>
          <li>
            <strong>Razorpay</strong> — payment and subscription processing (name, email, phone, plan).
          </li>
          <li>
            <strong>AI providers (Google Gemini, Groq)</strong> — the photos, audio, or text you submit to AI
            features, sent for processing when you use those features.
          </li>
          <li>
            <strong>Twilio</strong> — your phone number, to deliver verification OTPs.
          </li>
          <li>
            <strong>Email provider</strong> — your email address, for verification and password-reset messages.
          </li>
          <li>
            <strong>Hosting, database, and cache providers</strong> — store the data described above to run the
            Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Cookies">
        <p>
          We use strictly necessary cookies for authentication sessions. We do not use third-party advertising or
          tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention and deletion">
        <ul>
          <li>Your data is kept while your account is active.</li>
          <li>You can export your data anytime from Settings &rarr; Data.</li>
          <li>
            To delete your account and associated data, contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your registered email. We complete deletion
            within 30 days, except records we must keep for legal or accounting reasons (such as payment records).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Data is encrypted in transit, passwords are hashed, and access to production systems is restricted. No
          system is perfectly secure, so please use a strong, unique password.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          You may request access, correction, export, or deletion of your personal data by writing to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes and contact">
        <p>
          We may update this policy; material changes will be announced in the app or by email. See also our{" "}
          <Link href="/terms">Terms of Service</Link>. Questions? Contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
