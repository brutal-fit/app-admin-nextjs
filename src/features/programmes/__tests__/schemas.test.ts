import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  PROGRAMME_FIGURE_KEYS,
  isFigureKey,
  estimateWorkoutMinutes,
  firstIssueMessage,
  parseProgrammeSelection,
  programmesHref,
  saveDaySchema,
  savePlanSchema,
  setPlanActiveSchema,
  suggestPlanSlug,
  toDayPayload,
  toPlanPayload,
  workoutItemSchema,
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

describe("workoutItemSchema", () => {
  const reps = {
    exerciseId: ID,
    exerciseKind: "reps" as const,
    sets: 3,
    reps: 12,
    durationS: null,
    restS: 45,
    tempo: "",
  };
  const timed = { ...reps, exerciseKind: "timed" as const, reps: null, durationS: 30 };

  it("accepts a reps item with reps and a timed item with a duration", () => {
    expect(workoutItemSchema.safeParse(reps).success).toBe(true);
    expect(workoutItemSchema.safeParse(timed).success).toBe(true);
  });

  it.each([
    ["reps item without reps", { ...reps, reps: null }, "reps"],
    ["reps item with a duration", { ...reps, durationS: 30 }, "durationS"],
    ["reps item with 201 reps", { ...reps, reps: 201 }, "reps"],
    ["reps item with 0 reps", { ...reps, reps: 0 }, "reps"],
    ["reps item with fractional reps", { ...reps, reps: 1.5 }, "reps"],
    ["timed item without duration", { ...timed, durationS: null }, "durationS"],
    ["timed item with reps", { ...timed, reps: 10 }, "reps"],
    ["timed item with 4 seconds", { ...timed, durationS: 4 }, "durationS"],
    ["timed item with 3601 seconds", { ...timed, durationS: 3601 }, "durationS"],
  ])("rejects %s", (_, item, field) => {
    const result = workoutItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it("accepts the boundary values", () => {
    expect(workoutItemSchema.safeParse({ ...reps, reps: 1 }).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...reps, reps: 200 }).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...timed, durationS: 5 }).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...timed, durationS: 3600 }).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...reps, restS: 0 }).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...reps, restS: 600 }).success).toBe(true);
  });

  it.each([
    ["0 sets", { sets: 0 }],
    ["21 sets", { sets: 21 }],
    ["601 seconds of rest", { restS: 601 }],
    ["negative rest", { restS: -1 }],
    ["a 21 character tempo", { tempo: "x".repeat(21) }],
    ["a non-guid exercise", { exerciseId: "squat" }],
    ["an unknown kind", { exerciseKind: "yoga" }],
  ])("rejects %s", (_, patch) => {
    expect(workoutItemSchema.safeParse({ ...reps, ...patch }).success).toBe(false);
  });
});

describe("saveDaySchema and toDayPayload", () => {
  const reps = {
    exerciseId: ID,
    exerciseKind: "reps" as const,
    sets: 3,
    reps: 12,
    durationS: null,
    restS: 45,
    tempo: "",
  };
  const timed = { ...reps, exerciseKind: "timed" as const, reps: null, durationS: 30, tempo: "slow" };
  const day = { planId: ID, dayNumber: 1, title: "Day 1", builtBy: "", targetMinutes: null, items: [reps, timed] };

  it("builds the payload with only the field each kind uses, in order", () => {
    const payload = toDayPayload(saveDaySchema.parse(day));
    expect(payload.plan_id).toBe(ID);
    expect(payload.built_by).toBeNull();
    expect(payload.target_minutes).toBeNull();
    expect(payload.items).toEqual([
      { exercise_id: ID, sets: 3, rest_s: 45, tempo: null, reps: 12 },
      { exercise_id: ID, sets: 3, rest_s: 45, tempo: "slow", duration_s: 30 },
    ]);
  });

  it("keeps the id of an existing item", () => {
    const payload = toDayPayload(saveDaySchema.parse({ ...day, items: [{ ...reps, id: ID }] }));
    expect((payload.items as { id?: string }[])[0].id).toBe(ID);
  });

  it("accepts a rest day with no items", () => {
    const result = saveDaySchema.safeParse({ ...day, items: [], targetMinutes: 0 });
    expect(result.success).toBe(true);
    if (result.success) expect(toDayPayload(result.data).items).toEqual([]);
  });

  it("accepts 20 items and rejects 21", () => {
    expect(saveDaySchema.safeParse({ ...day, items: Array.from({ length: 20 }, () => reps) }).success).toBe(true);
    expect(saveDaySchema.safeParse({ ...day, items: Array.from({ length: 21 }, () => reps) }).success).toBe(false);
  });

  it.each([
    ["day 0", { dayNumber: 0 }],
    ["day 365", { dayNumber: 365 }],
    ["blank title", { title: "" }],
    ["241 target minutes", { targetMinutes: 241 }],
    ["negative target minutes", { targetMinutes: -1 }],
    ["a reps item without reps", { items: [{ ...reps, reps: null }] }],
  ])("rejects %s", (_, patch) => {
    expect(saveDaySchema.safeParse({ ...day, ...patch }).success).toBe(false);
  });

  it("accepts 240 target minutes and a null target", () => {
    expect(saveDaySchema.safeParse({ ...day, targetMinutes: 240 }).success).toBe(true);
    expect(saveDaySchema.safeParse({ ...day, targetMinutes: null }).success).toBe(true);
  });

  it("names the item in the first issue", () => {
    const result = saveDaySchema.safeParse({ ...day, items: [reps, { ...reps, reps: null }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error, "bad")).toBe("Item 2: Reps must be a whole number from 1 to 200.");
    }
  });

  it("falls back when there is no issue", () => {
    expect(firstIssueMessage(new z.ZodError([]), "bad")).toBe("bad");
  });
});

describe("estimateWorkoutMinutes", () => {
  it("is 0 for a rest day", () => {
    expect(estimateWorkoutMinutes([])).toBe(0);
  });

  it("counts 3 seconds a rep plus rest, per set, rounded up", () => {
    // 3 sets x (10 reps x 3s + 30s rest) = 180s = 3 minutes
    expect(
      estimateWorkoutMinutes([{ exerciseKind: "reps", sets: 3, reps: 10, durationS: null, restS: 30 }]),
    ).toBe(3);
    // 1 set x (1 rep x 3s) = 3s -> 1 minute
    expect(estimateWorkoutMinutes([{ exerciseKind: "reps", sets: 1, reps: 1, durationS: null, restS: 0 }])).toBe(1);
  });

  it("counts a timed item by its duration", () => {
    // 2 x (60 + 30) = 180s
    expect(
      estimateWorkoutMinutes([{ exerciseKind: "timed", sets: 2, reps: null, durationS: 60, restS: 30 }]),
    ).toBe(3);
  });

  it("treats incomplete numbers as nothing and caps at 240", () => {
    expect(
      estimateWorkoutMinutes([{ exerciseKind: "reps", sets: 3, reps: null, durationS: null, restS: Number.NaN }]),
    ).toBe(0);
    expect(
      estimateWorkoutMinutes([{ exerciseKind: "timed", sets: 20, reps: null, durationS: 3600, restS: 600 }]),
    ).toBe(240);
  });
});

describe("figure keys", () => {
  it("lists the fixed 15 keys", () => {
    expect(PROGRAMME_FIGURE_KEYS).toHaveLength(15);
    expect(isFigureKey("squat")).toBe(true);
    expect(isFigureKey("moonwalk")).toBe(false);
    expect(isFigureKey(null)).toBe(false);
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
