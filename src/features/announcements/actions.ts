"use server";

import { refresh } from "next/cache";
import { sendAnnouncement } from "@/lib/db/announcements";
import { runAction } from "@/server/run-action";
import { estimateRecipients } from "@/features/announcements/api";
import {
  estimateRecipientsSchema,
  sendAnnouncementSchema,
  type RecipientEstimate,
} from "@/features/announcements/schemas";
import type { ActionResult } from "@/types/action-result";

/** Read-only: who would receive this segment now. Writes nothing. */
export async function estimateRecipientsAction(input: unknown): Promise<ActionResult<RecipientEstimate>> {
  return runAction(estimateRecipientsSchema, input, "announcements.send", async (data, { supabase }) =>
    estimateRecipients(supabase, data.segment),
  );
}

// admin_send_notification resolves the audience, writes the notifications and the history
// row and audits the send; the count shown afterwards is the one it returns.
export async function sendAnnouncementAction(
  input: unknown,
): Promise<ActionResult<{ recipientCount: number }>> {
  return runAction(sendAnnouncementSchema, input, "announcements.send", async (data, { supabase }) => {
    const sent = await sendAnnouncement(supabase, data);
    refresh();
    return { recipientCount: sent.recipientCount };
  });
}
