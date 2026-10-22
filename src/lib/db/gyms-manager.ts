/*
 * The gym manager data layer, and the gym shapes both gym sides share. With gyms-admin.ts it
 * is the only code in src/ that spells the gym tables, the gym-photos bucket and the gym
 * functions (20261022035524_gyms.sql, 20261022050347_gyms_followups.sql). Every call runs
 * with the caller's own session: get_gym and the gym_* functions check an active manager row
 * in gym_staff for that gym (BRPRM otherwise), not a permission key. Every wrapper throws
 * AppError on failure, and every jsonb reply is checked with Zod before the panel renders it.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  BookingDetailsRow,
  BookingStatus,
  GymRequestRow,
  GymStaffRole,
  GymStatus,
  Json,
} from "@/types/database";

const TABLE = {
  gyms: "gyms",
  staff: "gym_staff",
  bookingDetails: "booking_details",
} as const;

export const GYM_PHOTO_BUCKET = "gym-photos";

const RPC = {
  getGym: "get_gym",
  bindInvites: "bind_gym_invites",
  listStaff: "gym_list_staff",
  listRequests: "gym_list_requests",
  allot: "gym_allot_trainer",
  decline: "gym_decline_request",
  reassign: "gym_reassign_trainer",
  respondToReschedule: "respond_to_reschedule",
  updateProfile: "gym_update_profile",
  setService: "gym_set_service",
  setHours: "gym_set_hours",
  invite: "gym_invite_staff",
  removeStaff: "gym_remove_staff",
  submit: "gym_submit_for_review",
} as const;

export const GYM_STATUS_VALUES = ["draft", "submitted", "verified", "listed", "suspended"] as const;

export const gymModeSchema = z.enum(["home", "online"]);
const optionalText = z.string().nullable().optional();

/** private.gym_json in manage mode (status and review fields are absent for clients). */
export const gymSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  address_text: z.string(),
  area: z.string(),
  city: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  facilities: z.array(z.string()),
  photos: z.array(z.string()),
  phone: z.string().nullable(),
  status: z.enum(GYM_STATUS_VALUES),
  listed: z.boolean(),
  review_note: optionalText,
  submitted_at: optionalText,
  verified_at: optionalText,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Gym = z.infer<typeof gymSchema>;

/** private.gym_service_json in manage mode: the gym's ask and whether a price is awaited. */
export const gymServiceSchema = z.object({
  id: z.string(),
  gym_id: z.string(),
  mode: gymModeSchema,
  title: z.string(),
  duration_minutes: z.number().int(),
  price_inr: z.number().int().nullable(),
  active: z.boolean(),
  submitted_price_inr: z.number().int(),
  price_approved_at: optionalText,
  awaiting_price: z.boolean(),
});
export type GymService = z.infer<typeof gymServiceSchema>;

export const gymHoursSchema = z.object({
  weekday: z.number().int(),
  start_minute: z.number().int(),
  end_minute: z.number().int(),
});
export type GymHoursWindow = z.infer<typeof gymHoursSchema>;

/** private.gym_staff_json: the name is null until the invite binds to an account. */
export const gymStaffSchema = z.object({
  id: z.string(),
  gym_id: z.string(),
  user_id: z.string().nullable(),
  name: z.string().nullable(),
  phone: z.string(),
  role: z.enum(["manager", "trainer"]),
  status: z.enum(["invited", "active", "removed"]),
  invited_at: z.string(),
  joined_at: z.string().nullable(),
  removed_at: z.string().nullable(),
});
export type GymStaffMember = z.infer<typeof gymStaffSchema>;

export const gymReviewSchema = z.object({
  booking_id: z.string(),
  rating: z.number().int(),
  body: z.string(),
  author_display_name: z.string(),
  created_at: z.string(),
});
export type GymReview = z.infer<typeof gymReviewSchema>;

/** get_gym for one of the caller's gyms (manage mode). */
export const managedGymSchema = gymSchema.extend({
  services: z.array(gymServiceSchema),
  hours: z.array(gymHoursSchema),
  rating: z.number().nullable(),
  review_count: z.number().int(),
  reviews: z.array(gymReviewSchema),
  can_manage: z.boolean(),
});
export type ManagedGym = z.infer<typeof managedGymSchema>;

/** Checks a jsonb reply against its schema; shared with gyms-admin.ts. */
export function parseGymReply<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", `The server sent ${what} in a shape this panel does not know.`);
  }
  return parsed.data;
}

/** Public URL of a gym photo (the bucket is public by URL); null without the Supabase URL. */
export function gymPhotoUrl(path: string, supabaseUrl: string | null | undefined): string | null {
  if (!supabaseUrl) return null;
  const base = supabaseUrl.replace(/\/+$/, "");
  const segments = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${GYM_PHOTO_BUCKET}/${segments}`;
}

/**
 * Binds pending staff invites for the signed-in account's phone. An account that existed
 * before its invite binds only through this call (new accounts bind on sign-up).
 */
export async function bindGymInvites(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc(RPC.bindInvites);
  if (error) throw toAppError(error);
  return data;
}

export type ManagedGymSummary = { id: string; name: string; status: GymStatus };

/** The gyms the user manages now: active manager rows, joined to the gym names. */
export async function listManagedGyms(
  client: AppSupabaseClient,
  userId: string,
): Promise<ManagedGymSummary[]> {
  const { data: rows, error } = await client
    .from(TABLE.staff)
    .select("gym_id")
    .eq("user_id", userId)
    .eq("role", "manager")
    .eq("status", "active");
  if (error) throw toAppError(error);
  const ids = [...new Set(rows.map((row) => row.gym_id))];
  if (ids.length === 0) return [];
  const { data: gyms, error: gymError } = await client
    .from(TABLE.gyms)
    .select("id, name, status")
    .in("id", ids)
    .order("name");
  if (gymError) throw toAppError(gymError);
  return gyms;
}

export async function getManagedGym(client: AppSupabaseClient, gymId: string): Promise<ManagedGym> {
  const { data, error } = await client.rpc(RPC.getGym, { p_id: gymId });
  if (error) throw toAppError(error);
  return parseGymReply(managedGymSchema, data, "the gym");
}

/**
 * The gym's active and invited staff with names (gym_list_staff; removed rows stay out),
 * managers first, then by invite time. The name is null until an invite binds to an account.
 */
export async function listGymStaff(client: AppSupabaseClient, gymId: string): Promise<GymStaffMember[]> {
  const { data, error } = await client.rpc(RPC.listStaff, { p_gym: gymId });
  if (error) throw toAppError(error);
  return parseGymReply(z.array(gymStaffSchema), data, "the staff list");
}

/** Requests and reschedule requests waiting on the gym, by session start. */
export async function listGymRequests(client: AppSupabaseClient, gymId: string): Promise<GymRequestRow[]> {
  const { data, error } = await client.rpc(RPC.listRequests, { p_gym: gymId });
  if (error) throw toAppError(error);
  return data;
}

export const GYM_BOOKINGS_MAX = 100;

/** The booking_details columns the gym pages read (not the gym's own name and address). */
export type GymBookingRow = Omit<BookingDetailsRow, "gym_name" | "gym_address_text">;

const BOOKING_DETAIL_COLUMNS =
  "id, client_id, trainer_id, service_title, mode, start_at, end_at, price_snapshot_inr, status, client_name, trainer_name, gym_id";

/**
 * The gym's bookings that start at or after `fromIso` (soonest first) or before it (latest
 * first), capped at GYM_BOOKINGS_MAX. Reads booking_details as the manager.
 */
export async function listGymBookings(
  client: AppSupabaseClient,
  input: {
    gymId: string;
    when: "upcoming" | "past";
    fromIso: string;
    statuses?: readonly BookingStatus[];
  },
): Promise<GymBookingRow[]> {
  let query = client.from(TABLE.bookingDetails).select(BOOKING_DETAIL_COLUMNS).eq("gym_id", input.gymId);
  query =
    input.when === "upcoming"
      ? query.gte("start_at", input.fromIso).order("start_at", { ascending: true })
      : query.lt("start_at", input.fromIso).order("start_at", { ascending: false });
  if (input.statuses) query = query.in("status", [...input.statuses]);
  const { data, error } = await query.limit(GYM_BOOKINGS_MAX);
  if (error) throw toAppError(error);
  return data;
}

export async function allotTrainer(client: AppSupabaseClient, bookingId: string, trainerUserId: string): Promise<void> {
  const { error } = await client.rpc(RPC.allot, { p_booking: bookingId, p_trainer_user: trainerUserId });
  if (error) throw toAppError(error);
}

export async function reassignTrainer(
  client: AppSupabaseClient,
  bookingId: string,
  trainerUserId: string,
): Promise<void> {
  const { error } = await client.rpc(RPC.reassign, { p_booking: bookingId, p_trainer_user: trainerUserId });
  if (error) throw toAppError(error);
}

export async function declineRequest(client: AppSupabaseClient, bookingId: string, reason: string): Promise<void> {
  const { error } = await client.rpc(RPC.decline, { p_booking: bookingId, p_reason: reason });
  if (error) throw toAppError(error);
}

/**
 * Answers a client's reschedule request on a gym booking: true moves the session to the asked
 * time (BRSLT when that time has gone), false keeps the original. On a gym booking the server
 * admits only a manager of that gym and tells the allotted trainer.
 */
export async function respondToReschedule(
  client: AppSupabaseClient,
  bookingId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await client.rpc(RPC.respondToReschedule, { p_id: bookingId, p_accept: accept });
  if (error) throw toAppError(error);
}

/** The profile fields gym_update_profile accepts; only the keys given are changed. */
export type GymProfileFields = Partial<{
  name: string;
  tagline: string;
  description: string;
  address_text: string;
  area: string;
  city: string;
  lat: number | null;
  lng: number | null;
  facilities: string[];
  photos: string[];
  phone: string | null;
}>;

export async function updateGymProfile(
  client: AppSupabaseClient,
  gymId: string,
  fields: GymProfileFields,
): Promise<void> {
  const { error } = await client.rpc(RPC.updateProfile, { p: { id: gymId, ...fields } as unknown as Json });
  if (error) throw toAppError(error);
}

/** Without an id it adds a service; a new or changed ask waits for BRUTAL's price. */
export type GymServicePayload = {
  gym_id: string;
  id?: string;
  title?: string;
  mode?: "home" | "online";
  duration_minutes?: number;
  submitted_price_inr?: number;
  active?: boolean;
};

export async function setGymService(client: AppSupabaseClient, payload: GymServicePayload): Promise<void> {
  const { error } = await client.rpc(RPC.setService, { p: payload as unknown as Json });
  if (error) throw toAppError(error);
}

/** Replaces the gym's whole week of opening windows. */
export async function setGymHours(
  client: AppSupabaseClient,
  gymId: string,
  windows: readonly GymHoursWindow[],
): Promise<void> {
  const { error } = await client.rpc(RPC.setHours, {
    p: { gym_id: gymId, windows: windows.map((w) => ({ ...w })) } as unknown as Json,
  });
  if (error) throw toAppError(error);
}

export async function inviteGymStaff(
  client: AppSupabaseClient,
  input: { gymId: string; phone: string; role: GymStaffRole },
): Promise<void> {
  const { error } = await client.rpc(RPC.invite, { p_gym: input.gymId, p_phone: input.phone, p_role: input.role });
  if (error) throw toAppError(error);
}

export async function removeGymStaff(client: AppSupabaseClient, staffId: string): Promise<void> {
  const { error } = await client.rpc(RPC.removeStaff, { p_staff: staffId });
  if (error) throw toAppError(error);
}

export async function submitGymForReview(client: AppSupabaseClient, gymId: string): Promise<void> {
  const { error } = await client.rpc(RPC.submit, { p_gym: gymId });
  if (error) throw toAppError(error);
}

/**
 * Uploads a photo into the gym's folder (the storage policy admits the gym's managers and
 * gyms.manage) and returns its storage path. Runs with whichever client the caller holds;
 * the panel uploads from the browser so the file never passes through a server action.
 */
export async function uploadGymPhoto(
  client: Pick<AppSupabaseClient, "storage">,
  gymId: string,
  file: File,
): Promise<string> {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${gymId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from(GYM_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new AppError("BRVAL", "The photo could not be uploaded. Use a JPEG, PNG or WebP under 5 MB.");
  return path;
}

/** Deletes stored photos; a failure leaves an unused file behind, never a broken gym. */
export async function removeGymPhotoFiles(client: AppSupabaseClient, paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await client.storage.from(GYM_PHOTO_BUCKET).remove([...paths]);
  if (error) throw toAppError(error);
}
