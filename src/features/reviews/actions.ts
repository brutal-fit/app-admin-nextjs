"use server";

import { refresh } from "next/cache";
import { moderateReview } from "@/lib/db/reviews";
import { runAction } from "@/server/run-action";
import { moderateReviewSchema } from "@/features/reviews/schemas";
import type { ActionResult } from "@/types/action-result";

// Hides or restores through admin_moderate_review, then refresh() re-renders the list so it
// reads the reviews again. Nothing is updated locally.
export async function moderateReviewAction(input: unknown): Promise<ActionResult> {
  return runAction(moderateReviewSchema, input, "reviews.moderate", async (data, { supabase }) => {
    await moderateReview(supabase, data);
    refresh();
    return undefined;
  });
}
