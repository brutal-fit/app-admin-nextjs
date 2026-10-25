import type { PaymentBooking, PaymentListRow } from "@/lib/db/payments";
import type { PaymentState } from "@/types/database";

/** 2026-10-22 12:00 India time. */
export const NOW = Date.parse("2026-10-22T06:30:00Z");

export const BOOKING_ID = "b1111111-1111-4111-8111-111111111111";

export function paymentRow(overrides: Partial<PaymentListRow> = {}): PaymentListRow {
  return {
    id: "a1111111-1111-4111-8111-111111111111",
    booking_id: BOOKING_ID,
    subscription_period_id: null,
    coaching_period_id: null,
    provider: "razorpay",
    order_id: "order_Paid0001",
    payment_id: "pay_Paid0001",
    amount_inr: 1200,
    currency: "INR",
    state: "paid",
    signature_verified: true,
    refund_id: null,
    refund_amount_inr: null,
    refund_reason: null,
    refund_attempts: 0,
    last_event_id: null,
    created_at: "2026-10-21T04:00:00Z",
    updated_at: "2026-10-21T04:00:00Z",
    ...overrides,
  };
}

/** One payment in each of the seven states; the refund_pending one was queued two hours ago. */
export function paymentsInEveryState(): PaymentListRow[] {
  const states: PaymentState[] = [
    "created",
    "paid",
    "failed",
    "refund_pending",
    "refund_requested",
    "refunded",
    "refund_failed",
  ];
  return states.map((state, index) =>
    paymentRow({
      id: `a${index}111111-1111-4111-8111-111111111111`,
      order_id: `order_State${index}`,
      payment_id: state === "created" ? null : `pay_State${index}`,
      state,
      updated_at: state === "refund_pending" ? new Date(NOW - 2 * 3600_000).toISOString() : new Date(NOW).toISOString(),
    }),
  );
}

export function paymentBooking(overrides: Partial<PaymentBooking> = {}): PaymentBooking {
  return {
    id: BOOKING_ID,
    serviceTitle: "Strength session",
    mode: "home",
    startAt: "2026-10-24T01:30:00Z",
    endAt: "2026-10-24T02:30:00Z",
    status: "confirmed",
    clientId: "c1111111-1111-4111-8111-111111111111",
    clientName: "Priya Shah",
    trainerId: "t1111111-1111-4111-8111-111111111111",
    trainerName: "Rahul Verma",
    gymId: null,
    gymName: null,
    ...overrides,
  };
}
