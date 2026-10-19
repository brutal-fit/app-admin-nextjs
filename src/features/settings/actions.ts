"use server";

import { refresh } from "next/cache";
import { setSetting } from "@/lib/db/settings";
import { runAction } from "@/server/run-action";
import { setSettingSchema } from "@/features/settings/schemas";
import type { ActionResult } from "@/types/action-result";

// One key per call through admin_set_setting, then refresh() re-renders the page with the
// stored value. A value the server refuses comes back with its text.
export async function setSettingAction(input: unknown): Promise<ActionResult> {
  return runAction(setSettingSchema, input, "catalogue.manage", async (data, { supabase }) => {
    await setSetting(supabase, data.key, data.value);
    refresh();
    return undefined;
  });
}
