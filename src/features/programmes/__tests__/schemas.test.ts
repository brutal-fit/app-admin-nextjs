import { describe, expect, it } from "vitest";
import {
  PROGRAMME_FIGURE_KEYS,
  firstIssueMessage,
  parseProgrammeSelection,
  programmesHref,
  saveDaySchema,
  savePlanSchema,
  setPlanActiveSchema,
  suggestPlanSlug,
  toDayPayload,
  toPlanPayload,
} from "@/features/programmes/schemas";

const ID = "11111111-1111-4111-8111-111111111111";

const validPlan = {
  id: null,
  title: "Home starter",
  slug: "home-starter",
  tagline: "Begin at home",
  description: "",
  weeks: 4,
  level: "beginner" as const,
  equipment: ["Mat"],
  weeklyPriceInr: 499,
  popular: false,
  active: false,
  sortOrder: 0,
};

const validItem = {
  kind: "workout" as const,
  title: "Squats",
  detail: "",
  minutes: 10,
  figureKey: "squat" as const,
};

describe("savePlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(savePlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it.each([
    ["blank title", { title: "  " }],
    ["long title", { title: "x".repeat(81) }],
    ["bad slug", { slug: "-bad" }],
    ["slug with spaces", { slug: "a b" }],
    ["zero weeks", { weeks: 0 }],
    ["53 weeks", { weeks: 53 }],
    ["fractional weeks", { weeks: 2.5 }],
    ["unknown level", { level: "elite" }],
    ["zero price", { weeklyPriceInr: 0 }],
    ["price over max", { weeklyPriceInr: 100001 }],
    ["11 equipment", { equipment: Array.from({ length: 11 }, (_, i) => `e${i}`) }],
    ["blank equipment", { equipment: [" "] }],
    ["negative sort", { sortOrder: -1 }],
    ["bad trainer id", { defaultTrainerId: "nope" }],
  ])("rejects %s", (_, patch) => {
    expect(savePlanSchema.safeParse({ ...validPlan, ...patch }).success).toBe(false);
  });

  it("lowercases and trims the slug", () => {
    const parsed = savePlanSchema.parse({ ...validPlan, slug: " Home-Starter " });
    expect(parsed.slug).toBe("home-starter");
  });
});

describe("toPlanPayload", () => {
  it("uses the function's field names and omits id and trainer when unset", () => {
    const payload = toPlanPayload(savePlanSchema.parse(validPlan));
    expect(payload.weekly_price_inr).toBe(499);
    expect(payload.sort_order).toBe(0);
    expect("id" in payload).toBe(false);
    expect("default_trainer_id" in payload).toBe(false);
  });

  it("sends id and a null trainer to clear it", () => {
    const payload = toPlanPayload(savePlanSchema.parse({ ...validPlan, id: ID, defaultTrainerId: null }));
    expect(payload.id).toBe(ID);
    expect(payload.default_trainer_id).toBeNull();
  });
});

describe("setPlanActiveSchema", () => {
  it("requires a plan id and a boolean", () => {
    expect(setPlanActiveSchema.safeParse({ id: ID, active: true }).success).toBe(true);
    expect(setPlanActiveSchema.safeParse({ id: "x", active: true }).success).toBe(false);
    expect(setPlanActiveSchema.safeParse({ id: ID, active: "yes" }).success).toBe(false);
  });
});

describe("saveDaySchema and toDayPayload", () => {
  const day = { planId: ID, dayNumber: 1, title: "Day 1", builtBy: "", items: [validItem] };

  it("accepts a valid day and builds the payload", () => {
    const payload = toDayPayload(saveDaySchema.parse(day));
    expect(payload.plan_id).toBe(ID);
    expect(payload.built_by).toBeNull();
    expect(payload.items).toEqual([
      { kind: "workout", title: "Squats", detail: "", minutes: 10, figure_key: "squat" },
    ]);
  });

  it("keeps the id of an existing item", () => {
    const payload = toDayPayload(saveDaySchema.parse({ ...day, items: [{ ...validItem, id: ID }] }));
    expect((payload.items as { id?: string }[])[0].id).toBe(ID);
  });

  it("accepts every listed figure key and rejects others", () => {
    for (const key of PROGRAMME_FIGURE_KEYS) {
      expect(saveDaySchema.safeParse({ ...day, items: [{ ...validItem, figureKey: key }] }).success).toBe(true);
    }
    expect(saveDaySchema.safeParse({ ...day, items: [{ ...validItem, figureKey: "moonwalk" }] }).success).toBe(false);
    expect(saveDaySchema.safeParse({ ...day, items: [{ ...validItem, figureKey: null }] }).success).toBe(true);
  });

  it.each([
    ["day 0", { dayNumber: 0 }],
    ["day 365", { dayNumber: 365 }],
    ["blank title", { title: "" }],
    ["21 items", { items: Array.from({ length: 21 }, () => validItem) }],
    ["unknown kind", { items: [{ ...validItem, kind: "yoga" }] }],
    ["blank item title", { items: [{ ...validItem, title: " " }] }],
    ["241 minutes", { items: [{ ...validItem, minutes: 241 }] }],
  ])("rejects %s", (_, patch) => {
    expect(saveDaySchema.safeParse({ ...day, ...patch }).success).toBe(false);
  });

  it("names the item in the first issue", () => {
    const result = saveDaySchema.safeParse({ ...day, items: [validItem, { ...validItem, title: "" }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssueMessage(result.error, "bad")).toBe("Item 2: Give the item a title.");
  });
});

describe("helpers", () => {
  it("suggests a slug from a title", () => {
    expect(suggestPlanSlug("Home & Core: 4 Weeks!")).toBe("home-and-core-4-weeks");
  });

  it("parses the URL selection and drops malformed values", () => {
    expect(parseProgrammeSelection({ plan: ID, day: "3" })).toEqual({ planId: ID, dayNumber: 3 });
    expect(parseProgrammeSelection({ plan: "nope", day: "3" })).toEqual({ planId: null, dayNumber: null });
    expect(parseProgrammeSelection({ plan: ID, day: "999" }).dayNumber).toBeNull();
    expect(parseProgrammeSelection({ day: "3" }).dayNumber).toBeNull();
  });

  it("builds the programmes href", () => {
    expect(programmesHref()).toBe("/catalogue?view=programmes");
    expect(programmesHref({ planId: ID, dayNumber: 2 })).toBe(`/catalogue?view=programmes&plan=${ID}&day=2`);
  });
});
