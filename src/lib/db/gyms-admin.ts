/*
 * The BRUTAL side of the gyms data layer: the admin_* gym functions (20261022035524_gyms.sql),
 * gyms.read to read and gyms.manage to write, audited. Every call runs with the caller's own
 * session, throws AppError on failure, and checks jsonb replies with Zod. The gym shapes both
 * sides share live in gyms-manager.ts.
 */
import { z } from "zod";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AdminGymListRow, BookingStatus, GymStatus, Json } from "@/types/database";
import {
  gymHoursSchema,
  gymModeSchema,
  gymReviewSchema,
  gymSchema,
  gymServiceSchema,
  gymStaffSchema,
  parseGymReply,
} from "@/lib/db/gyms-manager";

const RPC = {
  adminList: "admin_list_gyms",
  adminGet: "admin_get_gym",
  adminCreate: "admin_create_gym",
  adminVerify: "admin_verify_gym",
  adminSetListed: "admin_set_gym_listed",
  adminSetPrice: "admin_set_gym_service_price",
} as const;

const BOOKING_STATUS_VALUES = [
  "requested",
  "pending_confirmation",
  "confirmed",
  "reschedule_requested",
  "cancelled",
  "completed",
  "no_show",
  "disputed",
] as const satisfies readonly BookingStatus[];

const adminGymBookingSchema = z.object({
  id: z.string(),
  status: z.enum(BOOKING_STATUS_VALUES),
  mode: gymModeSchema,
  service_title: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  price_snapshot_inr: z.number().int(),
  payment_status: z.string(),
  client_id: z.string(),
  client_name: z.string().nullable(),
  trainer_id: z.string().nullable(),
  trainer_name: z.string().nullable(),
  allotted_at: z.string().nullable(),
});
export type AdminGymBooking = z.infer<typeof adminGymBookingSchema>;

/** admin_get_gym: the gym with services, hours, staff, the latest 50 bookings and reviews. */
export const adminGymDetailSchema = gymSchema.extend({
  verified_by: z.string().nullable(),
  verified_by_name: z.string().nullable(),
  services: z.array(gymServiceSchema),
  hours: z.array(gymHoursSchema),
  staff: z.array(gymStaffSchema),
  rating: z.number().nullable(),
  review_count: z.number().int(),
  bookings_count: z.number().int(),
  bookings: z.array(adminGymBookingSchema),
  reviews: z.array(gymReviewSchema.extend({ client_id: z.string() })),
});
export type AdminGymDetail = z.infer<typeof adminGymDetailSchema>;

export const ADMIN_GYM_LIST_MAX = 200;

export async function listGyms(
  client: AppSupabaseClient,
  filters: { status: GymStatus | null; search: string | null; limit: number; offset: number },
): Promise<{ rows: AdminGymListRow[]; total: number }> {
  const { data, error } = await client.rpc(RPC.adminList, {
    p_status: filters.status,
    p_search: filters.search,
    p_limit: Math.min(filters.limit, ADMIN_GYM_LIST_MAX),
    p_offset: filters.offset,
  });
  if (error) throw toAppError(error);
  const rows = data.map((row) => ({ ...row, total_count: Number(row.total_count) }));
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function getAdminGym(client: AppSupabaseClient, gymId: string): Promise<AdminGymDetail> {
  const { data, error } = await client.rpc(RPC.adminGet, { p_gym: gymId });
  if (error) throw toAppError(error);
  return parseGymReply(adminGymDetailSchema, data, "the gym");
}

/** The fields admin_create_gym takes: gym_update_profile's fields plus the first manager. */
export type CreateGymPayload = {
  name: string;
  address_text: string;
  area: string;
  city: string;
  tagline?: string;
  phone?: string;
  manager_phone: string;
};

/** Creates a draft gym and invites its first manager by phone; returns the new gym's id. */
export async function createGym(client: AppSupabaseClient, payload: CreateGymPayload): Promise<string> {
  const { data, error } = await client.rpc(RPC.adminCreate, { p: payload as unknown as Json });
  if (error) throw toAppError(error);
  return parseGymReply(gymSchema.pick({ id: true }), data, "the new gym").id;
}

export type GymDecision = "verified" | "rejected" | "suspended";

export async function verifyGym(
  client: AppSupabaseClient,
  input: { gymId: string; decision: GymDecision; note: string | null },
): Promise<void> {
  const { error } = await client.rpc(RPC.adminVerify, {
    p_gym: input.gymId,
    p_decision: input.decision,
    p_note: input.note,
  });
  if (error) throw toAppError(error);
}

export async function setGymListed(client: AppSupabaseClient, gymId: string, listed: boolean): Promise<void> {
  const { error } = await client.rpc(RPC.adminSetListed, { p_gym: gymId, p_listed: listed });
  if (error) throw toAppError(error);
}

/** Sets the platform price of a gym service, or withdraws it with null. */
export async function setGymServicePrice(
  client: AppSupabaseClient,
  serviceId: string,
  priceInr: number | null,
): Promise<void> {
  const { error } = await client.rpc(RPC.adminSetPrice, { p_service: serviceId, p_price_inr: priceInr });
  if (error) throw toAppError(error);
}
