"use server";

import { refresh } from "next/cache";
import { endCoaching, listCoachingPeriods } from "@/lib/db/coaching";
import { listPaymentsByIds } from "@/lib/db/payments";
import { can } from "@/lib/rbac/can";
import { runAction } from "@/server/run-action";
import { endCoachingSchema } from "@/features/coaching/schemas";
import { closeOutcome, type CloseOutcome } from "@/features/subscriptions/format";
import type { ActionResult } from "@/types/action-result";

/**
 * Ends a coaching on behalf of BRUTAL through end_coaching (bookings.cancel, the function
 * checks it again), then reads the months back so the dialog can say what the server queued
 * for refund. refresh() re-renders the page with the stored state.
 */
export async function endCoachingAction(input: unknown): Promise<ActionResult<CloseOutcome>> {
  return runAction(endCoachingSchema, input, "bookings.cancel", async (data, { supabase, access }) => {
    // The outcome is a read-back: a failed read leaves it unknown, never the end undone.
    const before = await listCoachingPeriods(supabase, [data.id]).catch(() => null);
    await endCoaching(supabase, data);
    refresh();
    const after = await listCoachingPeriods(supabase, [data.id]).catch(() => null);
    if (!before || !after) return { known: false };
    const queued = after.flatMap((period) =>
      period.status === "refund_pending" && period.payment_id ? [period.payment_id] : [],
    );
    const payments = can(access.permissions, "payments.read")
      ? await listPaymentsByIds(supabase, queued).catch(() => [])
      : [];
    return closeOutcome(before, after, payments);
  });
}
