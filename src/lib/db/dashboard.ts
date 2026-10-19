/*
 * The dashboard's data layer for the tables the panel has no pages for yet (support cases,
 * bookings) and the audit feed. Like rbac.ts and applications.ts, the only place these names
 * are spelled. Reads run with the admin's session, so RLS decides what is counted: support
 * cases need support.read; bookings admit any admin (private.is_admin()); the audit feed is
 * admin_list_audit, which checks audit.read. Every wrapper throws AppError on failure.
 */
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AuditLogRow, BookingStatus, SupportCaseStatus } from "@/types/database";

const TABLE = { supportCases: "support_cases", bookings: "bookings" } as const;
const RPC = { listAudit: "admin_list_audit" } as const;

/** Every support status that still needs someone (not resolved, not closed). */
export const OPEN_SUPPORT_STATUSES = [
  "open",
  "triaged",
  "waiting_for_user",
  "investigating",
  "escalated",
] as const satisfies readonly SupportCaseStatus[];

/** A booking request the trainer has not answered yet. */
export const PENDING_BOOKING_STATUSES = ["requested"] as const satisfies readonly BookingStatus[];

export async function countOpenSupportCases(client: AppSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from(TABLE.supportCases)
    .select("id", { count: "exact", head: true })
    .in("status", [...OPEN_SUPPORT_STATUSES]);
  if (error) throw toAppError(error);
  return count ?? 0;
}

/** Bookings starting in [from, to), cancelled ones left out. */
export async function countBookingsStarting(
  client: AppSupabaseClient,
  range: { from: string; to: string },
): Promise<number> {
  const { count, error } = await client
    .from(TABLE.bookings)
    .select("id", { count: "exact", head: true })
    .gte("start_at", range.from)
    .lt("start_at", range.to)
    .neq("status", "cancelled");
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function countPendingBookingRequests(client: AppSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from(TABLE.bookings)
    .select("id", { count: "exact", head: true })
    .in("status", [...PENDING_BOOKING_STATUSES]);
  if (error) throw toAppError(error);
  return count ?? 0;
}

/** The newest audit entries (the function caps a page at 200). */
export async function listAudit(client: AppSupabaseClient, limit: number): Promise<AuditLogRow[]> {
  const { data, error } = await client.rpc(RPC.listAudit, { p_limit: limit, p_offset: 0 });
  if (error) throw toAppError(error);
  return data;
}
