import { describe, expect, it, vi } from "vitest";
import { getBookingPayment, listPayments, refundPayment, type PaymentQuery } from "@/lib/db/payments";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { BOOKING_ID, paymentRow, paymentsInEveryState } from "@/features/payments/__tests__/fixtures";

type Row = Record<string, unknown>;
type Call = { method: string; args: unknown[] };

/**
 * A stand-in for the PostgREST builder: records every call and applies eq and in to the
 * fixture rows, so a filter that narrows on the server narrows here too.
 */
function fakeClient(rows: Row[]) {
  const calls: Call[] = [];
  const from = vi.fn((table: string) => {
    let current = [...rows];
    const builder = {
      select: (...args: unknown[]) => (calls.push({ method: "select", args: [table, ...args] }), builder),
      eq: (column: string, value: unknown) => {
        calls.push({ method: "eq", args: [column, value] });
        current = current.filter((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        calls.push({ method: "in", args: [column, values] });
        current = current.filter((row) => values.includes(row[column]));
        return builder;
      },
      or: (...args: unknown[]) => (calls.push({ method: "or", args }), builder),
      gte: (...args: unknown[]) => (calls.push({ method: "gte", args }), builder),
      lt: (...args: unknown[]) => (calls.push({ method: "lt", args }), builder),
      order: (...args: unknown[]) => (calls.push({ method: "order", args }), builder),
      limit: (...args: unknown[]) => (calls.push({ method: "limit", args }), builder),
      range: (...args: unknown[]) => (calls.push({ method: "range", args }), builder),
      maybeSingle: async () => ({ data: current[0] ?? null, error: null }),
      then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data: current, error: null }),
    };
    return builder;
  });
  return { client: { from } as unknown as AppSupabaseClient, calls, from };
}

const BASE: PaymentQuery = {
  state: null,
  attentionBefore: null,
  from: null,
  to: null,
  search: null,
  limit: 51,
  offset: 0,
};

describe("listPayments", () => {
  it("narrows to the payment whose order id matches", async () => {
    const { client, calls } = fakeClient(paymentsInEveryState());
    const all = await listPayments(client, BASE);
    expect(all).toHaveLength(7);
    const found = await listPayments(client, { ...BASE, search: { kind: "order", value: "order_State5" } });
    expect(found.map((row) => row.order_id)).toEqual(["order_State5"]);
    expect(calls).toContainEqual({ method: "eq", args: ["order_id", "order_State5"] });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
    expect(calls).toContainEqual({ method: "range", args: [0, 50] });
  });

  it("asks for failed refunds and stale queued refunds under Needs attention, ignoring the state", async () => {
    const { client, calls } = fakeClient([]);
    await listPayments(client, { ...BASE, state: "paid", attentionBefore: "2026-10-22T05:30:00.000Z" });
    expect(calls).toContainEqual({
      method: "or",
      args: ['state.eq.refund_failed,and(state.eq.refund_pending,updated_at.lt."2026-10-22T05:30:00.000Z")'],
    });
    expect(calls.some((call) => call.method === "eq" && call.args[0] === "state")).toBe(false);
  });

  it("applies the state, the dates, a uuid and a phone's booking ids", async () => {
    const { client, calls } = fakeClient(paymentsInEveryState());
    await listPayments(client, { ...BASE, state: "refunded", from: "a", to: "b" });
    expect(calls).toContainEqual({ method: "eq", args: ["state", "refunded"] });
    expect(calls).toContainEqual({ method: "gte", args: ["created_at", "a"] });
    expect(calls).toContainEqual({ method: "lt", args: ["created_at", "b"] });
    const id = "b1111111-1111-4111-8111-111111111111";
    await listPayments(client, { ...BASE, search: { kind: "uuid", value: id } });
    expect(calls).toContainEqual({ method: "or", args: [`booking_id.eq.${id},id.eq.${id}`] });
    await listPayments(client, { ...BASE, search: { kind: "bookings", ids: [id] } });
    expect(calls).toContainEqual({ method: "in", args: ["booking_id", [id]] });
  });

  it("makes no call when a phone search found no bookings", async () => {
    const { client, from } = fakeClient(paymentsInEveryState());
    expect(await listPayments(client, { ...BASE, search: { kind: "bookings", ids: [] } })).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("getBookingPayment", () => {
  it("prefers the live payment over a newer failed one, and is null without any", async () => {
    const failed = paymentRow({ id: "x1", state: "failed", created_at: "2026-10-22T00:00:00Z" });
    const live = paymentRow({ id: "x2", state: "paid", created_at: "2026-10-21T00:00:00Z" });
    expect((await getBookingPayment(fakeClient([failed, live]).client, BOOKING_ID))?.id).toBe("x2");
    expect((await getBookingPayment(fakeClient([failed]).client, BOOKING_ID))?.id).toBe("x1");
    expect(await getBookingPayment(fakeClient([]).client, "none")).toBeNull();
  });
});

function invokeClient(reply: { data: unknown; error: unknown }) {
  const invoke = vi.fn(async () => reply);
  return { client: { functions: { invoke } } as unknown as AppSupabaseClient, invoke };
}

function httpError(status: number, body: unknown) {
  return { name: "FunctionsHttpError", context: { status, json: async () => body } };
}

const PAYMENT = "a1111111-1111-4111-8111-111111111111";

describe("refundPayment", () => {
  it("calls the refund function with the payment id and the reason", async () => {
    const { client, invoke } = invokeClient({
      data: { payment_id: PAYMENT, refund_id: "rfnd_1", state: "refund_requested" },
      error: null,
    });
    const outcome = await refundPayment(client, { paymentId: PAYMENT, reason: "Client asked twice" });
    expect(invoke).toHaveBeenCalledWith("refund", { body: { payment_id: PAYMENT, reason: "Client asked twice" } });
    expect(outcome).toEqual({ outcome: "requested", state: "refund_requested", refundId: "rfnd_1" });
  });

  it("returns Razorpay's refusal as an outcome with the state the function reported", async () => {
    const { client } = invokeClient({
      data: null,
      error: httpError(502, { code: "provider_error", message: "x", state: "paid", attempts: 0 }),
    });
    const outcome = await refundPayment(client, { paymentId: PAYMENT, reason: "Client asked twice" });
    expect(outcome).toMatchObject({ outcome: "provider_error", state: "paid" });
  });

  it("throws the server's words for a payment that cannot be refunded, and BRPRM without the key", async () => {
    const refused = invokeClient({
      data: null,
      error: httpError(409, { code: "BRVAL", message: "This payment cannot be refunded.", state: "refunded" }),
    });
    await expect(refundPayment(refused.client, { paymentId: PAYMENT, reason: "Client asked twice" })).rejects.toMatchObject({
      code: "BRVAL",
      message: "This payment cannot be refunded.",
    });
    const forbidden = invokeClient({ data: null, error: httpError(403, { code: "BRPRM", message: "no" }) });
    await expect(refundPayment(forbidden.client, { paymentId: PAYMENT, reason: "Client asked twice" })).rejects.toMatchObject({
      code: "BRPRM",
    });
    const offline = invokeClient({ data: null, error: { name: "FunctionsFetchError", context: new Error("down") } });
    await expect(refundPayment(offline.client, { paymentId: PAYMENT, reason: "Client asked twice" })).rejects.toMatchObject({
      code: "NETWORK",
    });
  });
});
