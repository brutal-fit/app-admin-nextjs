"use server";

import { refresh } from "next/cache";
import {
  setProgrammePlanActive,
  upsertProgrammeDay,
  upsertProgrammePlan,
} from "@/lib/db/programmes";
import { runAction } from "@/server/run-action";
import {
  saveDaySchema,
  savePlanSchema,
  setPlanActiveSchema,
  toDayPayload,
  toPlanPayload,
} from "@/features/programmes/schemas";
import type { ActionResult } from "@/types/action-result";

// Every write goes through the admin programme functions (catalogue.manage, audited), then
// refresh() re-renders the page so it reads the plans again. No local copy of server data.

/** Creates or updates a plan; returns the stored plan's id so a new plan can open its days. */
export async function savePlanAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(savePlanSchema, input, "catalogue.manage", async (data, { supabase }) => {
    const plan = await upsertProgrammePlan(supabase, toPlanPayload(data));
    refresh();
    return { id: plan.id };
  });
}

export async function setPlanActiveAction(input: unknown): Promise<ActionResult> {
  return runAction(setPlanActiveSchema, input, "catalogue.manage", async (data, { supabase }) => {
    await setProgrammePlanActive(supabase, data.id, data.active);
    refresh();
    return undefined;
  });
}

/** Writes one whole day with its items in the order sent. */
export async function saveDayAction(input: unknown): Promise<ActionResult> {
  return runAction(saveDaySchema, input, "catalogue.manage", async (data, { supabase }) => {
    await upsertProgrammeDay(supabase, toDayPayload(data));
    refresh();
    return undefined;
  });
}
