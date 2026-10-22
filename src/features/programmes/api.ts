/*
 * Server-side loaders for the programmes tab on /catalogue (catalogue.manage) and the
 * enrolments on the user 360 (users.read). Each settles on its own so one failing read does
 * not blank the rest of the page. The exercise library is read only when a day is open, for
 * the workout editor's picker.
 */
import {
  listEnrolments,
  listOnlineTrainers,
  listProgrammeDays,
  listProgrammeItems,
  listProgrammePlans,
  type AdminEnrolment,
  type AdminProgrammePlan,
  type OnlineTrainerOption,
} from "@/lib/db/programmes";
import { loadExercises, type ExercisesState } from "@/features/exercises/api";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { ProgrammeDayRow, ProgrammeItemRow } from "@/types/database";
import type { ProgrammeSelection } from "@/features/programmes/schemas";

export type TrainerOptionsState =
  | { ok: true; options: OnlineTrainerOption[] }
  | { ok: false; error: string };

export type DaySelection = {
  dayNumber: number;
  /** Null when this day has not been written yet. */
  day: ProgrammeDayRow | null;
  items: ProgrammeItemRow[];
  /** The library the editor picks exercises from. */
  exercises: ExercisesState;
};

export type PlanSelection =
  | { ok: true; plan: AdminProgrammePlan; days: ProgrammeDayRow[]; selectedDay: DaySelection | null }
  | { ok: false; error: string };

export type ProgrammesResult =
  | {
      ok: true;
      plans: AdminProgrammePlan[];
      trainers: TrainerOptionsState;
      /** Null when no plan is chosen in the URL. */
      selection: PlanSelection | null;
    }
  | { ok: false; error: string };

async function loadTrainerOptions(client: AppSupabaseClient): Promise<TrainerOptionsState> {
  try {
    return { ok: true, options: await listOnlineTrainers(client) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

async function loadPlanSelection(
  client: AppSupabaseClient,
  plan: AdminProgrammePlan,
  dayNumber: number | null,
): Promise<PlanSelection> {
  try {
    const days = await listProgrammeDays(client, plan.id);
    if (dayNumber === null) return { ok: true, plan, days, selectedDay: null };
    if (dayNumber > plan.weeks * 7) {
      return { ok: false, error: `This plan runs ${plan.weeks * 7} days; day ${dayNumber} is past its end.` };
    }
    const day = days.find((entry) => entry.day_number === dayNumber) ?? null;
    const [items, exercises] = await Promise.all([
      day ? listProgrammeItems(client, day.id) : Promise.resolve<ProgrammeItemRow[]>([]),
      loadExercises(client),
    ]);
    return { ok: true, plan, days, selectedDay: { dayNumber, day, items, exercises } };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export async function loadProgrammes(
  client: AppSupabaseClient,
  selection: ProgrammeSelection,
): Promise<ProgrammesResult> {
  let plans: AdminProgrammePlan[];
  const trainersPromise = loadTrainerOptions(client);
  try {
    plans = await listProgrammePlans(client);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
  const chosen = selection.planId ? plans.find((plan) => plan.id === selection.planId) : undefined;
  const [trainers, planSelection] = await Promise.all([
    trainersPromise,
    selection.planId === null
      ? Promise.resolve(null)
      : chosen
        ? loadPlanSelection(client, chosen, selection.dayNumber)
        : Promise.resolve<PlanSelection>({ ok: false, error: "We could not find that plan." }),
  ]);
  return { ok: true, plans, trainers, selection: planSelection };
}

export type EnrolmentsState =
  | { ok: true; rows: AdminEnrolment[] }
  | { ok: false; error: string };

export async function loadEnrolments(client: AppSupabaseClient, userId: string): Promise<EnrolmentsState> {
  try {
    return { ok: true, rows: await listEnrolments(client, userId) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}
