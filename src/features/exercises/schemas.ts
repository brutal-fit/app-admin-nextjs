import { z } from "zod";
import { EXERCISE_KIND_VALUES } from "@/lib/db/programmes";
import { PROGRAMME_FIGURE_KEYS } from "@/features/programmes/schemas";
import type { ExerciseKind, Json } from "@/types/database";

// Limits as admin_upsert_exercise checks them (20261022021036_programme_library.sql).
export const EXERCISE_KEY_PATTERN = /^[a-z0-9][a-z0-9_]{1,59}$/;
export const EXERCISE_KEY_MAX = 60;
export const EXERCISE_NAME_MAX = 80;
export const EXERCISE_MUSCLE_MAX = 40;
export const EXERCISE_EQUIPMENT_MAX = 10;
export const EXERCISE_EQUIPMENT_NAME_MAX = 40;
export const EXERCISE_CUES_MIN = 2;
export const EXERCISE_CUES_MAX = 4;
export const EXERCISE_CUE_MAX = 160;
export const EXERCISE_VIDEO_URL_MAX = 500;
export const EXERCISE_SORT_MAX = 10000;
export const EXERCISE_SORT_STEP = 10;
// The function's own check is ^https://\S+$; the panel mirrors it so the refusal is local.
const VIDEO_URL_PATTERN = /^https:\/\/\S+$/;

export const EXERCISE_KINDS = EXERCISE_KIND_VALUES;
export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  reps: "Reps",
  timed: "Timed",
};
export const EXERCISE_KIND_HINTS: Record<ExerciseKind, string> = {
  reps: "Counted in reps; workouts set sets and reps.",
  timed: "Held for a time; workouts set sets and seconds.",
};

// ------------------------------------------------------------------ URL state

/** The catalogue page's exercise library tab: `/catalogue?view=exercises`. */
export const EXERCISES_VIEW = "exercises";

export function isExercisesView(params: Record<string, string | string[] | undefined>): boolean {
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  return view === EXERCISES_VIEW;
}

export function exercisesHref(): string {
  return `/catalogue?view=${EXERCISES_VIEW}`;
}

// ------------------------------------------------------------------ form

/** A key suggestion from a name: lowercase words joined by underscores. */
export function suggestExerciseKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, EXERCISE_KEY_MAX)
    .replace(/_+$/, "");
}

/** The sort order a new exercise starts with: after the last one, capped at the maximum. */
export function nextExerciseSortOrder(sortOrders: readonly number[]): number {
  if (sortOrders.length === 0) return 0;
  return Math.min(Math.max(...sortOrders) + EXERCISE_SORT_STEP, EXERCISE_SORT_MAX);
}

function wholeNumber(min: number, max: number, message: string) {
  return z.number({ error: message }).int(message).min(min, message).max(max, message);
}

const exerciseIdSchema = z.guid("Unknown exercise.");

export const saveExerciseSchema = z.object({
  /** Null creates an exercise. */
  id: exerciseIdSchema.nullable(),
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EXERCISE_KEY_PATTERN, "Use 2 to 60 lowercase letters, numbers or underscores for the key."),
  name: z
    .string()
    .trim()
    .min(1, "Give the exercise a name.")
    .max(EXERCISE_NAME_MAX, `Keep the name to ${EXERCISE_NAME_MAX} characters or fewer.`),
  muscleGroup: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Give a muscle group.")
    .max(EXERCISE_MUSCLE_MAX, `Keep the muscle group to ${EXERCISE_MUSCLE_MAX} characters or fewer.`),
  equipment: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Equipment names cannot be blank.")
        .max(EXERCISE_EQUIPMENT_NAME_MAX, `Keep each equipment name to ${EXERCISE_EQUIPMENT_NAME_MAX} characters or fewer.`),
    )
    .max(EXERCISE_EQUIPMENT_MAX, `List up to ${EXERCISE_EQUIPMENT_MAX} pieces of equipment.`),
  cues: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Cues cannot be blank; remove the empty one.")
        .max(EXERCISE_CUE_MAX, `Keep each cue to ${EXERCISE_CUE_MAX} characters or fewer.`),
    )
    .min(EXERCISE_CUES_MIN, `Give ${EXERCISE_CUES_MIN} to ${EXERCISE_CUES_MAX} cues.`)
    .max(EXERCISE_CUES_MAX, `Give ${EXERCISE_CUES_MIN} to ${EXERCISE_CUES_MAX} cues.`),
  kind: z.enum(EXERCISE_KINDS, { error: "Kind must be reps or timed." }),
  /** Empty means no video yet: the app shows the figure with "Demo video coming". */
  videoUrl: z
    .string()
    .trim()
    .max(EXERCISE_VIDEO_URL_MAX, `Keep the video link under ${EXERCISE_VIDEO_URL_MAX} characters.`)
    .refine(
      (value) => value === "" || VIDEO_URL_PATTERN.test(value),
      "The video link must start with https:// and have no spaces.",
    ),
  figureKey: z.enum(PROGRAMME_FIGURE_KEYS, { error: "Pick a figure from the list." }),
  sortOrder: wholeNumber(0, EXERCISE_SORT_MAX, `Sort order must be a whole number from 0 to ${EXERCISE_SORT_MAX}.`),
  active: z.boolean(),
});

export type SaveExerciseInput = z.input<typeof saveExerciseSchema>;
export type SaveExerciseData = z.output<typeof saveExerciseSchema>;

/** The admin_upsert_exercise payload, in the function's field names. */
export function toExercisePayload(data: SaveExerciseData): { [key: string]: Json } {
  const payload: { [key: string]: Json } = {
    key: data.key,
    name: data.name,
    muscle_group: data.muscleGroup,
    equipment: data.equipment,
    cues: data.cues,
    kind: data.kind,
    video_url: data.videoUrl === "" ? null : data.videoUrl,
    figure_key: data.figureKey,
    sort_order: data.sortOrder,
    active: data.active,
  };
  if (data.id) payload.id = data.id;
  return payload;
}

export const setExerciseActiveSchema = z.object({
  id: exerciseIdSchema,
  active: z.boolean(),
});
