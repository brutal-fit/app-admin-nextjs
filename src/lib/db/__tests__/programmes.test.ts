import { describe, expect, it, vi } from "vitest";
import {
  listEnrolments,
  listProgrammePlans,
  setProgrammePlanActive,
  upsertProgrammeDay,
  upsertProgrammePlan,
} from "@/lib/db/programmes";

const ID = "11111111-1111-4111-8111-111111111111";
const TS = "2026-10-21T00:00:00Z";

function clientWith(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { rpc, client: { rpc } as never };
}

const planRow = {
  id: ID,
  slug: "home-starter",
  title: "Home starter",
  tagline: "t",
  description: "d",
  weeks: 4,
  level: "beginner",
  equipment: [],
  weekly_price_inr: 499,
  popular: false,
  active: true,
  default_trainer_id: null,
  sort_order: 0,
  created_at: TS,
  updated_at: TS,
};

describe("listProgrammePlans", () => {
  it("reads admin_list_programme_plans and validates rows", async () => {
    const row = { ...planRow, default_trainer_name: null, day_count: 2, item_count: 6, open_enrolments: 0 };
    const { rpc, client } = clientWith({ data: [row] });
    expect(await listProgrammePlans(client)).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith("admin_list_programme_plans");
  });

  it("rejects a reply in an unknown shape", async () => {
    const { client } = clientWith({ data: [{ id: ID }] });
    await expect(listProgrammePlans(client)).rejects.toThrow(/programme plans/);
  });

  it("throws the mapped error", async () => {
    const { client } = clientWith({ error: { code: "42501", message: "denied" } });
    await expect(listProgrammePlans(client)).rejects.toBeDefined();
  });
});

describe("upsertProgrammePlan and setProgrammePlanActive", () => {
  it("sends the payload as p and returns the stored row", async () => {
    const { rpc, client } = clientWith({ data: planRow });
    expect((await upsertProgrammePlan(client, { slug: "x" })).slug).toBe("home-starter");
    expect(rpc).toHaveBeenCalledWith("admin_upsert_programme_plan", { p: { slug: "x" } });
  });

  it("sets active with p_plan and p_active", async () => {
    const { rpc, client } = clientWith({ data: { ...planRow, active: false } });
    expect((await setProgrammePlanActive(client, ID, false)).active).toBe(false);
    expect(rpc).toHaveBeenCalledWith("admin_set_plan_active", { p_plan: ID, p_active: false });
  });

  it("rejects an unknown level in the reply", async () => {
    const { client } = clientWith({ data: { ...planRow, level: "elite" } });
    await expect(upsertProgrammePlan(client, {})).rejects.toBeDefined();
  });
});

describe("upsertProgrammeDay", () => {
  const item = { id: ID, day_id: ID, kind: "workout", title: "Squats", detail: "", minutes: 10, figure_key: "squat", sort_order: 0 };

  it("sends the day as p and validates the reply", async () => {
    const reply = { id: ID, plan_id: ID, day_number: 1, title: "Day 1", built_by: null, items: [item] };
    const { rpc, client } = clientWith({ data: reply });
    expect((await upsertProgrammeDay(client, { day_number: 1 })).items).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith("admin_upsert_programme_day", { p: { day_number: 1 } });
  });

  it("rejects an unknown item kind", async () => {
    const reply = { id: ID, plan_id: ID, day_number: 1, title: "D", built_by: null, items: [{ ...item, kind: "yoga" }] };
    const { client } = clientWith({ data: reply });
    await expect(upsertProgrammeDay(client, {})).rejects.toBeDefined();
  });
});

describe("listEnrolments", () => {
  const row = {
    id: ID,
    client_id: ID,
    client_name: "Asha",
    trainer_id: null,
    trainer_name: null,
    plan_id: ID,
    plan_title: "Home starter",
    plan_weeks: 4,
    stage: "enrolled",
    payment_status: "pilot_free",
    enrolled_at: TS,
    started_on: null,
    cancelled_at: null,
    assessment: null,
    checks_done: 0,
  };

  it("calls admin_list_enrolments with p_user", async () => {
    const { rpc, client } = clientWith({ data: [row] });
    expect(await listEnrolments(client, ID)).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith("admin_list_enrolments", { p_user: ID });
  });

  it("accepts an empty list and an assessment object", async () => {
    expect(await listEnrolments(clientWith({ data: [] }).client, ID)).toEqual([]);
    const withAssessment = { ...row, assessment: { booking_id: ID, start: TS, status: "confirmed" } };
    expect(await listEnrolments(clientWith({ data: [withAssessment] }).client, ID)).toHaveLength(1);
  });

  it("rejects an unknown stage", async () => {
    const { client } = clientWith({ data: [{ ...row, stage: "paused" }] });
    await expect(listEnrolments(client, ID)).rejects.toThrow(/enrolments/);
  });
});
