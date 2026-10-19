import { describe, expect, it, vi } from "vitest";
import { getMetrics } from "@/lib/db/metrics";
import { AppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { metricsFixture } from "./metrics-fixture";

function client(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { rpc, client: { rpc } as unknown as AppSupabaseClient };
}

describe("getMetrics", () => {
  it("makes one admin_metrics call with the range", async () => {
    const fixture = metricsFixture();
    const { rpc, client: c } = client({ data: fixture, error: null });
    const metrics = await getMetrics(c, { from: "2026-10-01", to: "2026-10-07" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("admin_metrics", { p_from: "2026-10-01", p_to: "2026-10-07" });
    expect(metrics).toEqual(fixture);
  });

  it("accepts null rates for an empty range", async () => {
    const fixture = metricsFixture();
    fixture.bookings.completion_rate = null;
    fixture.reviews.average = null;
    const { client: c } = client({ data: fixture, error: null });
    await expect(getMetrics(c, { from: "a", to: "b" })).resolves.toBeDefined();
  });

  it("rejects a shape it does not know", async () => {
    const { client: c } = client({ data: { signups: 1 }, error: null });
    await expect(getMetrics(c, { from: "a", to: "b" })).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a rate outside 0..1", async () => {
    const fixture = metricsFixture();
    fixture.bookings.completion_rate = 1.5;
    const { client: c } = client({ data: fixture, error: null });
    await expect(getMetrics(c, { from: "a", to: "b" })).rejects.toBeInstanceOf(AppError);
  });

  it("maps a database refusal to its code", async () => {
    const { client: c } = client({ data: null, error: { code: "BRPRM", message: "denied" } });
    await expect(getMetrics(c, { from: "a", to: "b" })).rejects.toMatchObject({ code: "BRPRM" });
  });

  it("maps a range refusal to BRVAL", async () => {
    const { client: c } = client({ data: null, error: { code: "BRVAL", message: "too long" } });
    await expect(getMetrics(c, { from: "a", to: "b" })).rejects.toMatchObject({ code: "BRVAL" });
  });
});
