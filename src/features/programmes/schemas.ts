import { z } from "zod";
import { EXERCISE_KIND_VALUES, PROGRAMME_LEVEL_VALUES } from "@/lib/db/programmes";
import type { ExerciseKind, Json, ProgrammeLevel } from "@/types/database";

// Limits as admin_upsert_programme_plan and admin_upsert_programme_day check them.
export const PLAN_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,59}$/;
export const PLAN_SLUG_MAX = 60;
export const PLAN_TITLE_MAX = 80;
export const PLAN_TAGLINE_MAX = 140;
export const PLAN_DESCRIPTION_MAX = 2000;
export const PLAN_WEEKS_MIN = 1;
export const PLAN_WEEKS_MAX = 52;
export const PLAN_EQUIPMENT_MAX = 10;
export const PLAN_EQUIPMENT_NAME_MAX = 40;
export const PLAN_PRICE_MIN = 1;
export const PLAN_PRICE_MAX = 100000;
export const PLAN_SORT_MAX = 10000;
export const DAY_TITLE_MAX = 80;
export const DAY_BUILT_BY_MAX = 80;
export const DAY_ITEMS_MAX = 20;
export const DAY_TARGET_MINUTES_MAX = 240;
export const ITEM_SETS_MIN = 1;
export const ITEM_SETS_MAX = 20;
export const ITEM_REPS_MIN = 1;
export const ITEM_REPS_MAX = 200;
export const ITEM_DURATION_MIN = 5;
export const ITEM_DURATION_MAX = 3600;
export const ITEM_REST_MAX = 600;
export const ITEM_TEMPO_MAX = 20;
/** admin_upsert_programme_day counts a rep as 3 seconds when it estimates a day's minutes. */
export const SECONDS_PER_REP = 3;
/** programme_days.day_number allows up to 364 (52 weeks). */
export const DAY_NUMBER_MAX = PLAN_WEEKS_MAX * 7;

export const PROGRAMME_LEVELS = PROGRAMME_LEVEL_VALUES;
export const PROGRAMME_LEVEL_LABELS: Record<ProgrammeLevel, string> = {
  beginner: "Beginner",
  regular: "Regular",
  advanced: "Advanced",
};

/**
 * The person figures the app can draw, the same fixed set as private.programme_figure_keys();
 * the function refuses any other key.
 */
export const PROGRAMME_FIGURE_KEYS = [
  "squat",
  "pushup",
  "lunge",
  "plank",
  "glute_bridge",
  "mountain_climber",
  "burpee",
  "superman",
  "deadbug",
  "jumping_jack",
  "calf_raise",
  "child_pose",
  "cat_cow",
  "hip_hinge",
  "row",
] as const;
export type ProgrammeFigureKey = (typeof PROGRAMME_FIGURE_KEYS)[number];

export const PROGRAMME_FIGURE_LABELS: Record<ProgrammeFigureKey, string> = {
  squat: "Squat",
  pushup: "Push-up",
  lunge: "Lunge",
  plank: "Plank",
  glute_bridge: "Glute bridge",
  mountain_climber: "Mountain climber",
  burpee: "Burpee",
  superman: "Superman",
  deadbug: "Dead bug",
  jumping_jack: "Jumping jack",
  calf_raise: "Calf raise",
  child_pose: "Child's pose",
  cat_cow: "Cat-cow",
  hip_hinge: "Hip hinge",
  row: "Row",
};

export function isFigureKey(value: string | null | undefined): value is ProgrammeFigureKey {
  return typeof value === "string" && (PROGRAMME_FIGURE_KEYS as readonly string[]).includes(value);
}

// ------------------------------------------------------------------ URL state

/** The catalogue page's programmes tab: `?view=programmes`, plus the plan and day being edited. */
export const PROGRAMMES_VIEW = "programmes";

export type ProgrammeSelection = { planId: string | null; dayNumber: number | null };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isProgrammesView(params: Record<string, string | string[] | undefined>): boolean {
  return first(params.view) === PROGRAMMES_VIEW;
}

/** The plan and day from the URL; anything malformed reads as not chosen. */
export function parseProgrammeSelection(
  params: Record<string, string | string[] | undefined>,
): ProgrammeSelection {
  const plan = first(params.plan);
  const planId = plan && z.guid().safeParse(plan).success ? plan : null;
  const day = first(params.day);
  const dayNumber = day && /^\d{1,3}$/.test(day) ? Number(day) : null;
  return {
    planId,
    dayNumber: planId && dayNumber !== null && dayNumber >= 1 && dayNumber <= DAY_NUMBER_MAX ? dayNumber : null,
  };
}

export function programmesHref(selection: Partial<ProgrammeSelection> = {}): string {
  const params = new URLSearchParams({ view: PROGRAMMES_VIEW });
  if (selection.planId) {
    params.set("plan", selection.planId);
    if (selection.dayNumber) params.set("day", String(selection.dayNumber));
  }
  return `/catalogue?${params.toString()}`;
}

// ------------------------------------------------------------------ plan form

/** A slug suggestion from a title: lowercase words joined by dashes. */
export function suggestPlanSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PLAN_SLUG_MAX)
    .replace(/-+$/, "");
}

function wholeNumber(min: number, max: number, message: string) {
  return z.number({ error: message }).int(message).min(min, message).max(max, message);
}

const planIdSchema = z.guid("Unknown plan.");

export const savePlanSchema = z.object({
  /** Null creates a plan. */
  id: planIdSchema.nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Give the plan a title.")
    .max(PLAN_TITLE_MAX, `Keep the title to ${PLAN_TITLE_MAX} characters or fewer.`),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(PLAN_SLUG_PATTERN, "Use 2 to 60 lowercase letters, numbers or dashes for the slug, starting with a letter or number."),
  tagline: z.string().trim().max(PLAN_TAGLINE_MAX, `Keep the tagline to ${PLAN_TAGLINE_MAX} characters or fewer.`),
  description: z
    .string()
    .trim()
    .max(PLAN_DESCRIPTION_MAX, `Keep the description to ${PLAN_DESCRIPTION_MAX} characters or fewer.`),
  weeks: wholeNumber(PLAN_WEEKS_MIN, PLAN_WEEKS_MAX, `Weeks must be a whole number from ${PLAN_WEEKS_MIN} to ${PLAN_WEEKS_MAX}.`),
  level: z.enum(PROGRAMME_LEVELS, { error: "Level must be beginner, regular or advanced." }),
  equipment: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Equipment names cannot be blank.")
        .max(PLAN_EQUIPMENT_NAME_MAX, `Keep each equipment name to ${PLAN_EQUIPMENT_NAME_MAX} characters or fewer.`),
    )
    .max(PLAN_EQUIPMENT_MAX, `List up to ${PLAN_EQUIPMENT_MAX} pieces of equipment.`),
  weeklyPriceInr: wholeNumber(
    PLAN_PRICE_MIN,
    PLAN_PRICE_MAX,
    `The weekly price must be a whole number of rupees from ${PLAN_PRICE_MIN} to ${PLAN_PRICE_MAX}.`,
  ),
  popular: z.boolean(),
  active: z.boolean(),
  sortOrder: wholeNumber(0, PLAN_SORT_MAX, `Sort order must be a whole number from 0 to ${PLAN_SORT_MAX}.`),
  /**
   * Null clears the default trainer; left out keeps the stored one, so a trainer who stopped
   * coaching online does not block other edits to the plan.
   */
  defaultTrainerId: z.guid("Pick a trainer from the list.").nullable().optional(),
});

export type SavePlanInput = z.input<typeof savePlanSchema>;
export type SavePlanData = z.output<typeof savePlanSchema>;

/** The admin_upsert_programme_plan payload, in the function's field names. */
export function toPlanPayload(data: SavePlanData): { [key: string]: Json } {
  const payload: { [key: string]: Json } = {
    slug: data.slug,
    title: data.title,
    tagline: data.tagline,
    description: data.description,
    weeks: data.weeks,
    level: data.level,
    equipment: data.equipment,
    weekly_price_inr: data.weeklyPriceInr,
    popular: data.popular,
    active: data.active,
    sort_order: data.sortOrder,
  };
  if (data.id) payload.id = data.id;
  if (data.defaultTrainerId !== undefined) payload.default_trainer_id = data.defaultTrainerId;
  return payload;
}

export const setPlanActiveSchema = z.object({
  id: planIdSchema,
  active: z.boolean(),
});

// ------------------------------------------------------------------ workout editor

const itemCountMessage = "Enter a whole number.";

/**
 * One exercise of a workout day. `exerciseKind` is the picked exercise's kind from the
 * library: a reps exercise takes reps and no duration, a timed one a duration in seconds and
 * no reps, as admin_upsert_programme_day checks them.
 */
export const workoutItemSchema = z
  .object({
    /** Null or left out for a new item; an existing item keeps its id so clients' ticks survive. */
    id: z.guid("This item belongs to another day.").nullable().optional(),
    exerciseId: z.guid("Pick an exercise from the library."),
    exerciseKind: z.enum(EXERCISE_KIND_VALUES, { error: "Pick an exercise from the library." }),
    sets: wholeNumber(ITEM_SETS_MIN, ITEM_SETS_MAX, `Sets must be a whole number from ${ITEM_SETS_MIN} to ${ITEM_SETS_MAX}.`),
    reps: z.number({ error: itemCountMessage }).nullable(),
    durationS: z.number({ error: itemCountMessage }).nullable(),
    restS: wholeNumber(0, ITEM_REST_MAX, `Rest must be a whole number of seconds from 0 to ${ITEM_REST_MAX}.`),
    tempo: z.string().trim().max(ITEM_TEMPO_MAX, `Keep the tempo to ${ITEM_TEMPO_MAX} characters or fewer.`),
  })
  .superRefine((item, context) => {
    const within = (value: number | null, min: number, max: number) =>
      value !== null && Number.isInteger(value) && value >= min && value <= max;
    if (item.exerciseKind === "reps") {
      if (!within(item.reps, ITEM_REPS_MIN, ITEM_REPS_MAX)) {
        context.addIssue({
          code: "custom",
          path: ["reps"],
          message: `Reps must be a whole number from ${ITEM_REPS_MIN} to ${ITEM_REPS_MAX}.`,
        });
      }
      if (item.durationS !== null) {
        context.addIssue({
          code: "custom",
          path: ["durationS"],
          message: "This exercise is counted in reps, not seconds.",
        });
      }
    } else {
      if (!within(item.durationS, ITEM_DURATION_MIN, ITEM_DURATION_MAX)) {
        context.addIssue({
          code: "custom",
          path: ["durationS"],
          message: `Duration must be a whole number of seconds from ${ITEM_DURATION_MIN} to ${ITEM_DURATION_MAX}.`,
        });
      }
      if (item.reps !== null) {
        context.addIssue({
          code: "custom",
          path: ["reps"],
          message: "This exercise is held for a time, not counted in reps.",
        });
      }
    }
  });

export type WorkoutItemInput = z.input<typeof workoutItemSchema>;

export const saveDaySchema = z.object({
  planId: planIdSchema,
  dayNumber: wholeNumber(1, DAY_NUMBER_MAX, `The day must be a whole number from 1 to ${DAY_NUMBER_MAX}.`),
  title: z
    .string()
    .trim()
    .min(1, "Give the day a title.")
    .max(DAY_TITLE_MAX, `Keep the day title to ${DAY_TITLE_MAX} characters or fewer.`),
  builtBy: z.string().trim().max(DAY_BUILT_BY_MAX, `Keep "built by" to ${DAY_BUILT_BY_MAX} characters or fewer.`),
  /** Null lets the server count it from the exercises (0 on a rest day). */
  targetMinutes: wholeNumber(
    0,
    DAY_TARGET_MINUTES_MAX,
    `Target minutes must be a whole number from 0 to ${DAY_TARGET_MINUTES_MAX}.`,
  ).nullable(),
  /** No items makes a rest day. */
  items: z.array(workoutItemSchema).max(DAY_ITEMS_MAX, `A workout holds up to ${DAY_ITEMS_MAX} exercises.`),
});

export type SaveDayInput = z.input<typeof saveDaySchema>;
export type SaveDayData = z.output<typeof saveDaySchema>;

/**
 * The admin_upsert_programme_day payload: the whole day, exercises in the order shown (the
 * server numbers them 10 apart). Only the field the exercise's kind uses is sent.
 */
export function toDayPayload(data: SaveDayData): { [key: string]: Json } {
  return {
    plan_id: data.planId,
    day_number: data.dayNumber,
    title: data.title,
    built_by: data.builtBy === "" ? null : data.builtBy,
    target_minutes: data.targetMinutes,
    items: data.items.map((item) => {
      const entry: { [key: string]: Json } = {
        exercise_id: item.exerciseId,
        sets: item.sets,
        rest_s: item.restS,
        tempo: item.tempo === "" ? null : item.tempo,
      };
      if (item.exerciseKind === "reps") entry.reps = item.reps;
      else entry.duration_s = item.durationS;
      if (item.id) entry.id = item.id;
      return entry;
    }),
  };
}

type MinutesItem = {
  exerciseKind: ExerciseKind;
  sets: number;
  reps: number | null;
  durationS: number | null;
  restS: number;
};

/**
 * The minutes the server sets as the day's target when none is given: every set's work (a
 * rep counts 3 seconds) plus its rest, rounded up, at most 240. Items with numbers not yet
 * valid count as nothing, so the estimate never shows NaN.
 */
export function estimateWorkoutMinutes(items: readonly MinutesItem[]): number {
  const safe = (value: number | null) => (value !== null && Number.isFinite(value) && value > 0 ? value : 0);
  const seconds = items.reduce((total, item) => {
    const work = item.exerciseKind === "timed" ? safe(item.durationS) : safe(item.reps) * SECONDS_PER_REP;
    return total + safe(item.sets) * (work + safe(item.restS));
  }, 0);
  return Math.min(Math.ceil(seconds / 60), DAY_TARGET_MINUTES_MAX);
}

/** The first problem in words, naming the item ("Item 2: ...") when it is about one. */
export function firstIssueMessage(error: z.ZodError, fallback: string): string {
  const issue = error.issues[0];
  if (!issue) return fallback;
  const [head, index] = issue.path;
  if (head === "items" && typeof index === "number" && issue.path.length > 2) {
    return `Item ${index + 1}: ${issue.message}`;
  }
  return issue.message;
}
