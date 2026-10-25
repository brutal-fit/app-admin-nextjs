import { describe, expect, it } from "vitest";
import { closeOutcome, closeOutcomeText, currentPeriod, formatSlots } from "@/features/subscriptions/format";
import { parseSubscriptionFilters, subscriptionListHref } from "@/features/subscriptions/schemas";
import { TRAINER_ID, periodRow } from "./fixtures";

const P1 = periodRow({ id: "p1", seq: 1, starts_on: "2026-10-01", ends_on: "2026-10-28" });
const P2 = periodRow({ id: "p2", seq: 2, starts_on: "2026-10-29", ends_on: "2026-11-25" });

describe("currentPeriod", () => {
  it("picks the period covering today, else the next, else the last", () => {
    expect(currentPeriod([P1, P2], "2026-10-10")?.id).toBe("p1");
    expect(currentPeriod([P1, P2], "2026-09-01")?.id).toBe("p1");
    expect(currentPeriod([P1, P2], "2026-12-01")?.id).toBe("p2");
    expect(currentPeriod([], "2026-10-10")).toBeNull();
  });
});

describe("closeOutcome", () => {
  it("counts paid periods turned refund_pending and unpaid ones turned lapsed", () => {
    const before = [{ ...P1, status: "paid" as const }, { ...P2, status: "unpaid" as const, payment_id: null }];
    const after = [{ ...P1, status: "refund_pending" as const }, { ...P2, status: "lapsed" as const, payment_id: null }];
    const outcome = closeOutcome(before, after, []);
    expect(outcome).toEqual({ known: true, refunds: [{ seq: 1, amountInr: null, partial: false }], lapsed: 1 });
    expect(closeOutcomeText(outcome, "month")).toBe(
      "Refund queued: month 1. The refund queue sends it to Razorpay within minutes. The refund amount needs the View payments permission (payments.read). 1 unpaid month lapsed.",
    );
  });

  it("says when nothing was refunded", () => {
    const outcome = closeOutcome([P1], [P1], []);
    expect(closeOutcomeText(outcome, "period")).toBe("No refund: nothing paid was left to refund.");
  });
});

describe("subscription helpers", () => {
  it("formats slots Monday first", () => {
    expect(formatSlots([{ weekday: 5, start_minute: 1110 }, { weekday: 1, start_minute: 420 }])).toBe("Mon 07:00, Fri 18:30");
  });

  it("keeps known filters from the URL and drops the rest", () => {
    const filters = parseSubscriptionFilters({ status: "active", period: "year", trainer: TRAINER_ID, page: "2" });
    expect(filters).toEqual({ status: "active", period: null, trainerId: TRAINER_ID, page: 2 });
    expect(subscriptionListHref(filters, { period: "quarter" })).toBe(
      `/subscriptions?status=active&period=quarter&trainer=${TRAINER_ID}`,
    );
  });
});
