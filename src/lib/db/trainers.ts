/*
 * The trainers data layer: the only file in src/ that spells the trainer profile, services
 * and rating names and the trainer admin functions. Reads run with the admin's session:
 * trainer_profiles and services admit any admin (private.is_admin()), the rating view
 * follows reviews. Writes go through admin_update_trainer_profile and admin_set_services
 * (trainers.edit) and admin_request_documents (documents.review), all in
 * 20261019000500_adminops_trainers_bookings_reviews.sql. Every wrapper throws AppError.
 */
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  DocumentKind,
  Json,
  ServiceInputJson,
  ServiceRow,
  TrainerProfileRow,
  TrainerRatingSummaryRow,
} from "@/types/database";

const TABLE = {
  profiles: "trainer_profiles",
  services: "services",
  ratings: "trainer_rating_summaries",
} as const;

const RPC = {
  updateProfile: "admin_update_trainer_profile",
  setServices: "admin_set_services",
  requestDocuments: "admin_request_documents",
} as const;

// search_text is a derived column the panel never needs.
const PROFILE_COLUMNS =
  "trainer_id, display_name, headline, bio, specialties, modes, service_area, languages, years_experience, verified_checks, availability_tags, certifications, approved_home_rate_inr, approved_online_rate_inr, pricing_acknowledged_at, published, offers_coaching, created_at, updated_at";

export type TrainerProfileSummaryRow = Pick<
  TrainerProfileRow,
  "trainer_id" | "display_name" | "published" | "approved_home_rate_inr" | "approved_online_rate_inr"
>;

/** The listing-facing part of several profiles (list page). */
export async function listTrainerProfiles(
  client: AppSupabaseClient,
  trainerIds: readonly string[],
): Promise<TrainerProfileSummaryRow[]> {
  if (trainerIds.length === 0) return [];
  const { data, error } = await client
    .from(TABLE.profiles)
    .select("trainer_id, display_name, published, approved_home_rate_inr, approved_online_rate_inr")
    .in("trainer_id", [...trainerIds]);
  if (error) throw toAppError(error);
  return data;
}

export async function getTrainerProfile(
  client: AppSupabaseClient,
  trainerId: string,
): Promise<TrainerProfileRow> {
  const { data, error } = await client
    .from(TABLE.profiles)
    .select(PROFILE_COLUMNS)
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) {
    throw new AppError("BRNTF", "This trainer has no profile. Profiles are created on approval.");
  }
  return data;
}

/** Every service of a trainer, inactive ones included (they are never deleted). */
export async function listServices(
  client: AppSupabaseClient,
  trainerId: string,
): Promise<ServiceRow[]> {
  const { data, error } = await client
    .from(TABLE.services)
    .select("*")
    .eq("trainer_id", trainerId)
    .order("mode")
    .order("created_at");
  if (error) throw toAppError(error);
  return data;
}

/** Ratings by trainer; a trainer without visible reviews has no row. */
export async function listRatingSummaries(
  client: AppSupabaseClient,
  trainerIds: readonly string[],
): Promise<Map<string, TrainerRatingSummaryRow>> {
  if (trainerIds.length === 0) return new Map();
  const { data, error } = await client
    .from(TABLE.ratings)
    .select("trainer_id, review_count, average_rating")
    .in("trainer_id", [...trainerIds]);
  if (error) throw toAppError(error);
  return new Map(data.map((row) => [row.trainer_id, row]));
}

/** The profile fields admin_update_trainer_profile accepts; only the keys given are sent. */
export type TrainerProfileFields = Partial<{
  headline: string;
  bio: string;
  years_experience: number;
  specialties: string[];
  languages: string[];
  service_area: string;
  published: boolean;
  /** 20261024035357: the trainer can be picked as a coach for library programmes. */
  offers_coaching: boolean;
}>;

export async function updateTrainerProfile(
  client: AppSupabaseClient,
  trainerId: string,
  fields: TrainerProfileFields,
): Promise<void> {
  const { error } = await client.rpc(RPC.updateProfile, {
    p_trainer: trainerId,
    p_fields: fields as Json,
  });
  if (error) throw toAppError(error);
}

/**
 * Replaces the trainer's service list: rows with an id are updated, rows without one are
 * created, and active services missing from the list are deactivated. The function then sets
 * the approved rate per mode to the lowest active price; booking price snapshots never change.
 */
export async function setServices(
  client: AppSupabaseClient,
  trainerId: string,
  services: readonly ServiceInputJson[],
): Promise<void> {
  const { error } = await client.rpc(RPC.setServices, {
    p_trainer: trainerId,
    p_services: services as unknown as Json,
  });
  if (error) throw toAppError(error);
}

/**
 * Moves the application to needs_information with the message, rejects the named document
 * kinds and notifies the trainer. On an approved trainer this also takes them off the listing
 * until they resubmit and are approved again.
 */
export async function requestDocuments(
  client: AppSupabaseClient,
  input: { trainerId: string; message: string; kinds: DocumentKind[] },
): Promise<void> {
  const { error } = await client.rpc(RPC.requestDocuments, {
    p_trainer: input.trainerId,
    p_message: input.message,
    p_kinds: input.kinds,
  });
  if (error) throw toAppError(error);
}
