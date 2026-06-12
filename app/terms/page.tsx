import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL_BRAND, LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service — FitTrack",
  description: "The terms that govern your use of FitTrack, including Pro subscriptions and billing.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={LEGAL_LAST_UPDATED}>
      <LegalSection title="1. Acceptance of these terms">
        <p>
          By creating an account or using {LEGAL_BRAND} (the &ldquo;Service&rdquo;), you agree to these Terms of
          Service and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the
          Service.
        </p>
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          {LEGAL_BRAND} helps you track meals, workouts, weight, hydration, and related habits, and offers optional
          AI-assisted features such as meal photo estimates and an AI coach.
        </p>
        <p>
          {LEGAL_BRAND} is not a medical service. Calorie and nutrition figures, AI estimates, and coach suggestions
          are informational only and may be inaccurate. They are not medical, dietary, or training advice. Consult a
          qualified professional before making significant changes to your diet or exercise, especially if you have a
          health condition.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account">
        <ul>
          <li>You must provide accurate information and keep your credentials secure.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>You must be at least 18 years old, or use the Service under the supervision of a legal guardian.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Pro subscription and billing">
        <ul>
          <li>
            {LEGAL_BRAND} Pro is a recurring subscription billed through our payment partner, Razorpay. The price and
            billing period are shown on the <Link href="/pricing">pricing page</Link> and at checkout.
          </li>
          <li>
            By subscribing, you authorise recurring charges to your chosen payment method (including UPI Autopay or
            card e-mandates) at the start of each billing period, until you cancel.
          </li>
          <li>
            You can cancel anytime from Settings &rarr; Subscription. Cancellation takes effect at the end of the
            current billing period, and you keep Pro access until then. See our{" "}
            <Link href="/refunds">Cancellation &amp; Refund Policy</Link>.
          </li>
          <li>Prices may change; we will notify you in advance and the new price applies from your next renewal.</li>
          <li>
            If a renewal charge fails, we may retry it. If payment cannot be collected, your account reverts to the
            free plan.
          </li>
          <li>AI features are subject to fair-use limits to protect the Service from abuse.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <ul>
          <li>Do not attempt to break, overload, reverse-engineer, or gain unauthorised access to the Service.</li>
          <li>Do not use the Service to store or transmit unlawful content.</li>
          <li>Do not resell or share AI features, or use automation to circumvent fair-use limits.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Your data">
        <p>
          You own the data you log. You can export it anytime from Settings &rarr; Data. How we collect and process
          data is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate accounts that violate these terms or
          abuse the Service. On termination, your subscription is cancelled per the{" "}
          <Link href="/refunds">refund policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers and limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted
          by law, {LEGAL_BRAND} is not liable for indirect or consequential damages, and our total liability for any
          claim is limited to the subscription fees you paid in the three months before the claim arose.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing law">
        <p>These terms are governed by the laws of India. Courts at the company&rsquo;s registered location have exclusive jurisdiction.</p>
      </LegalSection>

      <LegalSection title="10. Changes and contact">
        <p>
          We may update these terms; material changes will be announced in the app or by email. Questions? Contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
