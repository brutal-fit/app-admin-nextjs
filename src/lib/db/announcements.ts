/*
 * The announcements data layer: the only file in src/ that spells announcements and
 * admin_send_notification (20261019000600_adminops_catalogue_announcements.sql). History reads
 * need announcements.send (RLS); the function resolves the recipients, writes one
 * notifications row each and the announcement with its count, and audits the send. The
 * trainer city lookup feeds the panel's recipient estimate (RLS: applications.read). Every
 * wrapper throws AppError.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AnnouncementRow, AnnouncementSegmentJson, Json } from "@/types/database";

const TABLE = { announcements: "announcements", applications: "trainer_applications" } as const;
const RPC = { send: "admin_send_notification" } as const;

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
 * Trainers whose application names this city, compared as admin_send_notification does
 * (trimmed, case-insensitive). The ilike narrows the read; the exact test runs here.
 */
export async function listTrainerIdsInCity(
  client: AppSupabaseClient,
  city: string,
): Promise<Set<string>> {
  const wanted = city.trim().toLowerCase();
  const pattern = `%${wanted.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const { data, error } = await client
    .from(TABLE.applications)
    .select("trainer_id, city")
    .ilike("city", pattern);
  if (error) throw toAppError(error);
  return new Set(
    data.filter((row) => row.city.trim().toLowerCase() === wanted).map((row) => row.trainer_id),
  );
}
