/*
 * The announcements data layer: the only file in src/ that spells announcements,
 * admin_send_notification (20261019000600_adminops_catalogue_announcements.sql) and
 * admin_count_recipients (20261019000800_adminops_round2.sql). History reads need
 * announcements.send (RLS); the send resolves the recipients, writes one notifications row
 * each and the announcement with its count, and audits the send; the count shares its
 * audience rule. Every wrapper throws AppError.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AnnouncementRow, AnnouncementSegmentJson, Json } from "@/types/database";

const TABLE = { announcements: "announcements" } as const;
const RPC = { send: "admin_send_notification", count: "admin_count_recipients" } as const;

/** Newest first. */
export async function listAnnouncements(
  client: AppSupabaseClient,
  limit: number,
): Promise<AnnouncementRow[]> {
  const { data, error } = await client
    .from(TABLE.announcements)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return data;
}

const sentSchema = z.object({
  id: z.string(),
  recipient_count: z.coerce.number().int(),
});

export type SentAnnouncement = { id: string; recipientCount: number };

/** Sends to every matching active account; the count is the server's. */
export async function sendAnnouncement(
  client: AppSupabaseClient,
  input: { segment: AnnouncementSegmentJson; title: string; body: string; route: string | null },
): Promise<SentAnnouncement> {
  const { data, error } = await client.rpc(RPC.send, {
    p_segment: input.segment as Json,
    p_title: input.title,
    p_body: input.body,
    p_route: input.route,
  });
  if (error) throw toAppError(error);
  const parsed = sentSchema.safeParse(data);
  if (!parsed.success) throw new AppError("UNKNOWN", "The server sent an unexpected reply.");
  return { id: parsed.data.id, recipientCount: parsed.data.recipient_count };
}

/**
 * How many active accounts the segment reaches now, by the same audience rule the send uses
 * (admin_count_recipients). No size or empty-audience check here; the send enforces those.
 */
export async function countRecipients(
  client: AppSupabaseClient,
  segment: AnnouncementSegmentJson,
): Promise<number> {
  const { data, error } = await client.rpc(RPC.count, { p_segment: segment as Json });
  if (error) throw toAppError(error);
  return Number(data);
}
