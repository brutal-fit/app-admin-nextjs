import type { PartyNames } from "@/features/subscriptions/api";
import type {
  CoachingPeriodRow,
  PeriodStatus,
  ProgrammeCoachingRow,
  SubscriptionPeriodRow,
  SubscriptionRow,
  SubscriptionStatus,
} from "@/types/database";

export const CLIENT_ID = "c1111111-1111-4111-8111-111111111111";
export const TRAINER_ID = "d1111111-1111-4111-8111-111111111111";
export const SUBSCRIPTION_ID = "e1111111-1111-4111-8111-111111111111";
export const COACHING_ID = "f1111111-1111-4111-8111-111111111111";
export const PLAN_ID = "a2222222-2222-4222-8222-222222222222";
export const PAYMENT_ID = "a3333333-3333-4333-8333-333333333333";

export const NAMES: PartyNames = {
  clients: { [CLIENT_ID]: "Priya Shah" },
  trainers: { [TRAINER_ID]: "Rahul Verma" },
  clientNote: null,
};

export function subscriptionRow(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: SUBSCRIPTION_ID,
    client_id: CLIENT_ID,
    trainer_id: TRAINER_ID,
    service_id: "b2222222-2222-4222-8222-222222222222",
    mode: "home",
    sessions_per_week: 3,
    period: "month",
    weeks: 4,
    starts_on: "2026-10-20",
    ends_on: "2026-11-16",
    status: "active",
    session_price_inr: 1000,
    discount_pct: 10,
    period_price_inr: 10800,
    credits: 1,
    cancellation_reason: null,
    cancelled_by: null,
    created_at: "2026-10-18T04:00:00Z",
    updated_at: "2026-10-18T04:00:00Z",
    ...overrides,
  };
}

/** One subscription in each of the five statuses. */
export function subscriptionsInEveryStatus(): SubscriptionRow[] {
  const statuses: SubscriptionStatus[] = ["requested", "active", "paused", "cancelled", "expired"];
  return statuses.map((status, index) =>
    subscriptionRow({ id: `e${index}111111-1111-4111-8111-111111111111`, status }),
  );
}

export function periodRow(overrides: Partial<SubscriptionPeriodRow> = {}): SubscriptionPeriodRow {
  return {
    id: "a4444444-4444-4444-8444-444444444441",
    subscription_id: SUBSCRIPTION_ID,
    seq: 1,
    starts_on: "2026-10-20",
    ends_on: "2026-11-16",
    price_inr: 10800,
    payment_id: PAYMENT_ID,
    status: "paid",
    reminder_sent_at: null,
    created_at: "2026-10-18T04:00:00Z",
    ...overrides,
  };
}

export const ALL_PERIOD_STATUSES: PeriodStatus[] = ["unpaid", "paid", "refund_pending", "refunded", "lapsed"];

export function coachingRow(overrides: Partial<ProgrammeCoachingRow> = {}): ProgrammeCoachingRow {
  return {
    id: COACHING_ID,
    client_id: CLIENT_ID,
    coach_id: TRAINER_ID,
    plan_id: PLAN_ID,
    enrolment_id: null,
    status: "active",
    fee_inr: 1500,
    starts_on: "2026-10-20",
    ends_on: "2026-11-19",
    conversation_id: "a5555555-5555-4555-8555-555555555555",
    cancellation_reason: null,
    cancelled_by: null,
    created_at: "2026-10-19T04:00:00Z",
    updated_at: "2026-10-19T04:00:00Z",
    ...overrides,
  };
}

export function coachingPeriodRow(overrides: Partial<CoachingPeriodRow> = {}): CoachingPeriodRow {
  return {
    id: "a6666666-6666-4666-8666-666666666661",
    coaching_id: COACHING_ID,
    seq: 1,
    starts_on: "2026-10-20",
    ends_on: "2026-11-19",
    price_inr: 1500,
    payment_id: PAYMENT_ID,
    status: "paid",
    reminder_sent_at: null,
    created_at: "2026-10-19T04:00:00Z",
    ...overrides,
  };
}
