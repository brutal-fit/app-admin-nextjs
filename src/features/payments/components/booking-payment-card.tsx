import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { formatInr } from "@/features/applications/format";
import { PaymentStateBadge } from "@/features/payments/components/payment-state-badge";
import type { BookingPaymentState } from "@/features/payments/api";
import { permittedHref } from "@/features/support/format";

/**
 * The Payment card on the booking page: the booking's live (else latest) payment with its
 * state, amount and a link to it. A booking without one predates payments. Needs
 * payments.read; without it the card says so instead of claiming there is no payment.
 */
export function BookingPaymentCard({
  state,
  permissions,
}: {
  state: BookingPaymentState;
  permissions: readonly string[];
}) {
  return (
    <section aria-labelledby="booking-payment" className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-tile">
      <h2 id="booking-payment" className="text-base font-semibold">
        Payment
      </h2>
      {state.kind === "ok" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <PaymentStateBadge state={state.payment.state} />
            <span className="font-medium tabular-nums">{formatInr(state.payment.amount_inr)}</span>
          </div>
          {permittedHref(permissions, `/payments/${state.payment.id}`) ? (
            <Link
              href={`/payments/${state.payment.id}`}
              className="focus-ring inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 hover:underline"
            >
              Open payment
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : state.kind === "none" ? (
        <p className="text-sm text-muted-foreground">No payment (legacy booking)</p>
      ) : (
        <p className="text-sm text-muted-foreground">{state.reason}</p>
      )}
    </section>
  );
}
