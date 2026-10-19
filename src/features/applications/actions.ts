"use server";

import { refresh } from "next/cache";
import {
  createDocumentSignedUrl,
  getApplicationModes,
  reviewApplication,
  reviewDocument,
} from "@/lib/db/applications";
import { AppError } from "@/lib/supabase/errors";
import { runAction } from "@/server/run-action";
import {
  missingPriceMessage,
  openDocumentSchema,
  reviewApplicationSchema,
  reviewDocumentSchema,
} from "@/features/applications/schemas";
import type { ActionResult } from "@/types/action-result";

export async function reviewApplicationAction(input: unknown): Promise<ActionResult> {
  return runAction(
    reviewApplicationSchema,
    input,
    "applications.review",
    async (data, { supabase }) => {
      const approving = data.status === "approved";
      // The modes come from the database, not the form, so the price rule cannot be skipped.
      if (approving) {
        const modes = await getApplicationModes(supabase, data.trainerId);
        const missing = missingPriceMessage(data.status, modes, {
          home: data.homeRateInr,
          online: data.onlineRateInr,
        });
        if (missing) throw new AppError("BRVAL", missing);
      }
      await reviewApplication(supabase, {
        trainerId: data.trainerId,
        status: data.status,
        note: data.note,
        // Prices and checks only mean something on approval; the server ignores them otherwise.
        homeRateInr: approving ? data.homeRateInr : null,
        onlineRateInr: approving ? data.onlineRateInr : null,
        verifiedChecks: approving ? data.verifiedChecks : null,
      });
      refresh();
      return undefined;
    },
  );
}

export async function reviewDocumentAction(input: unknown): Promise<ActionResult> {
  return runAction(reviewDocumentSchema, input, "documents.review", async (data, { supabase }) => {
    await reviewDocument(supabase, data);
    refresh();
    return undefined;
  });
}

export async function openDocumentAction(input: unknown): Promise<ActionResult<{ url: string }>> {
  return runAction(openDocumentSchema, input, "documents.review", async (data, { supabase }) => ({
    url: await createDocumentSignedUrl(supabase, data.documentId),
  }));
}
