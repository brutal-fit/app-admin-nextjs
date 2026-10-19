"use server";

import { refresh } from "next/cache";
import { cancelBooking, resolveDispute } from "@/lib/db/bookings";
import { runAction } from "@/server/run-action";
import { cancelBookingSchema, resolveDisputeSchema } from "@/features/bookings/schemas";
import type { ActionResult } from "@/types/action-result";

// Each action calls one admin function, then refresh() re-renders the booking page so it
// reads the booking again. Nothing is updated locally; the server's words are shown on error.

export async function cancelBookingAction(input: unknown): Promise<ActionResult> {
  return runAction(cancelBookingSchema, input, "bookings.cancel", async (data, { supabase }) => {
    await cancelBooking(supabase, data);
    refresh();
    return undefined;
  });
}

export async function resolveDisputeAction(input: unknown): Promise<ActionResult> {
  return runAction(resolveDisputeSchema, input, "bookings.cancel", async (data, { supabase }) => {
    await resolveDispute(supabase, data);
    refresh();
    return undefined;
  });
}
