"use server";

import { refresh } from "next/cache";
import { setExerciseActive, upsertExercise } from "@/lib/db/programmes";
import { runAction } from "@/server/run-action";
import {
  saveExerciseSchema,
  setExerciseActiveSchema,
  toExercisePayload,
} from "@/features/exercises/schemas";
import type { ActionResult } from "@/types/action-result";

// Every write goes through the admin exercise functions (catalogue.manage, audited), then
// refresh() re-renders the page so it reads the library again. No local copy of server data.

export async function saveExerciseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(saveExerciseSchema, input, "catalogue.manage", async (data, { supabase }) => {
    const exercise = await upsertExercise(supabase, toExercisePayload(data));
    refresh();
    return { id: exercise.id };
  });
}

export async function setExerciseActiveAction(input: unknown): Promise<ActionResult> {
  return runAction(setExerciseActiveSchema, input, "catalogue.manage", async (data, { supabase }) => {
    await setExerciseActive(supabase, data.id, data.active);
    refresh();
    return undefined;
  });
}
