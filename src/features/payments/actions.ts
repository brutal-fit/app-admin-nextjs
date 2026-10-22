"use server";

import { refresh } from "next/cache";
import { refundPayment, type RefundOutcome } from "@/lib/db/payments";
import { runAction } from "@/server/run-action";
import { refundPaymentSchema } from "@/features/payments/schemas";
import type { ActionResult } from "@/types/action-result";

/**
 * Refunds a payment in full through the `refund` Edge Function with the admin's session, then
 * refresh() re-reads the page so it shows the state the server now holds. Razorpay refusing
 * the call is an outcome, not an error: the dialog shows the state the function reported.
 */
export async function refundPaymentAction(input: unknown): Promise<ActionResult<RefundOutcome>> {
  return runAction(refundPaymentSchema, input, "payments.manage", async (data, { supabase }) => {
    const outcome = await refundPayment(supabase, data);
    refresh();
    return outcome;
  });
}
