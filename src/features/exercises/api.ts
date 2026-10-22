/*
 * Server-side loader for the exercise library: the Exercises tab on /catalogue and the
 * exercise picker of the workout editor (catalogue.manage). Settles on its own so a failing
 * read does not blank the rest of the page.
 */
import { listExercises, type AdminExercise } from "@/lib/db/programmes";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";

export type ExercisesState = { ok: true; rows: AdminExercise[] } | { ok: false; error: string };

export async function loadExercises(client: AppSupabaseClient): Promise<ExercisesState> {
  try {
    return { ok: true, rows: await listExercises(client) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}
