import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { LEGAL_BRAND, LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — FitTrack",
  description: "How to cancel a FitTrack Pro subscription and when refunds apply.",
};

export default function RefundsPage() {
  return (
    <LegalPage title="Cancellation & Refund Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <LegalSection title="1. Cancelling your subscription">
        <ul>
          <li>
            Cancel anytime from <strong>Settings &rarr; Subscription &rarr; Cancel subscription</strong>. No calls, no
            emails required.
          </li>
          <li>
            Cancellation takes effect at the end of your current billing period. You keep {LEGAL_BRAND} Pro access
            until then, and you are not charged again.
          </li>
          <li>Your logged data is unaffected — you simply return to the free plan.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Refunds">
        <ul>
          <li>
            Subscription fees are <strong>non-refundable for partial billing periods</strong>: cancelling mid-period
            stops future charges but does not refund the current one.
          </li>
          <li>
            We do refund, in full:
            <ul>
              <li>duplicate or erroneous charges;</li>
              <li>charges made after you cancelled (for example, due to a processing error);</li>
              <li>
                charges where a verified technical fault on our side made Pro features unusable for most of the
                billing period.
              </li>
            </ul>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How to request a refund">
        <p>
          Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your registered email within 30 days
          of the charge, including the payment reference from Razorpay. We respond within 5 business days.
        </p>
      </LegalSection>

      <LegalSection title="4. How refunds are paid">
        <p>
          Approved refunds are issued to the original payment method via Razorpay, typically within 5&ndash;7 business
          days depending on your bank.
        </p>
      </LegalSection>

      <LegalSection title="5. Related policies">
        <p>
          See the <Link href="/terms">Terms of Service</Link> for full subscription terms and the{" "}
          <Link href="/privacy">Privacy Policy</Link> for how payment data is handled.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
