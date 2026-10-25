"use server";

import { refresh } from "next/cache";
import { listPaymentsByIds } from "@/lib/db/payments";
import { cancelSubscription, listSubscriptionPeriods } from "@/lib/db/subscriptions";
import { can } from "@/lib/rbac/can";
import { runAction } from "@/server/run-action";
import { closeOutcome, type CloseOutcome } from "@/features/subscriptions/format";
import { cancelSubscriptionSchema } from "@/features/subscriptions/schemas";
import type { ActionResult } from "@/types/action-result";

/**
 * Cancels a subscription on behalf of BRUTAL through cancel_subscription (bookings.cancel, the
 * function checks it again), then reads the periods back so the dialog can say what the
 * server queued for refund. refresh() re-renders the page with the stored state.
 */
export async function cancelSubscriptionAction(input: unknown): Promise<ActionResult<CloseOutcome>> {
  return runAction(cancelSubscriptionSchema, input, "bookings.cancel", async (data, { supabase, access }) => {
    // The outcome is a read-back: a failed read leaves it unknown, never the cancel undone.
    const before = await listSubscriptionPeriods(supabase, [data.id]).catch(() => null);
    await cancelSubscription(supabase, data);
    refresh();
    const after = await listSubscriptionPeriods(supabase, [data.id]).catch(() => null);
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
