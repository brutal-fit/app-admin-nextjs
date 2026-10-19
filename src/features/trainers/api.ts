/*
 * Server-side loaders for the trainer pages. A trainer here is an approved application with
 * its public profile; the route needs applications.read, documents need documents.review
 * and booking counts need bookings.read, each said on the page when missing.
 */
import {
  getApplication,
  listApplications,
  listDocuments,
  type DocumentSummaryRow,
} from "@/lib/db/applications";
import { countBookingsByTrainer } from "@/lib/db/bookings";
import { listActiveCatalogue } from "@/lib/db/catalogue";
import {
  getTrainerProfile,
  listRatingSummaries,
  listServices,
  listTrainerProfiles,
} from "@/lib/db/trainers";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type {
  ApplicationStatus,
  CatalogueKind,
  ServiceRow,
  SessionMode,
  TrainerProfileRow,
  TrainerRatingSummaryRow,
} from "@/types/database";
import { missingPermissionMessage } from "@/features/users/format";
import {
  TRAINER_LIST_LIMIT,
  trainerIdSchema,
  type CatalogueOptions,
  type ListedFilter,
} from "@/features/trainers/schemas";

export type TrainerListItem = {
  trainerId: string;
  name: string;
  city: string;
  modes: SessionMode[];
  /** Whether the trainer shows in client search (trainer_profiles.published). */
  listed: boolean;
  averageRating: number | null;
  reviewCount: number;
  /** Null when the session cannot read bookings. */
  bookings: number | null;
  homeRateInr: number | null;
  onlineRateInr: number | null;
};

export type TrainerListResult =
  | {
      ok: true;
      rows: TrainerListItem[];
      /** The approved list hit TRAINER_LIST_LIMIT. */
      capped: boolean;
      /** Why booking counts are missing or only floors; null when they are exact. */
      bookingsNote: string | null;
    }
  | { ok: false; error: string };

export async function loadTrainerList(
  client: AppSupabaseClient,
  access: SessionAccess,
  filter: ListedFilter,
): Promise<TrainerListResult> {
  try {
    const applications = await listApplications(client, {
      statuses: ["approved"],
      limit: TRAINER_LIST_LIMIT,
    });
    const ids = applications.map((row) => row.trainer_id);
    const canReadBookings = can(access.permissions, "bookings.read");
    const [profiles, ratings, bookings] = await Promise.all([
      listTrainerProfiles(client, ids),
      listRatingSummaries(client, ids),
      canReadBookings ? countBookingsByTrainer(client, ids) : Promise.resolve(null),
    ]);
    const profileById = new Map(profiles.map((profile) => [profile.trainer_id, profile]));
    const rows = applications
      .map((application): TrainerListItem => {
        const profile = profileById.get(application.trainer_id);
        const rating = ratings.get(application.trainer_id);
        return {
          trainerId: application.trainer_id,
          name: profile?.display_name || application.full_name || "Unnamed",
          city: application.city,
          modes: application.modes,
          listed: profile?.published ?? false,
          averageRating: rating?.average_rating ?? null,
          reviewCount: rating?.review_count ?? 0,
          bookings: bookings ? (bookings.counts.get(application.trainer_id) ?? 0) : null,
          homeRateInr: profile?.approved_home_rate_inr ?? null,
          onlineRateInr: profile?.approved_online_rate_inr ?? null,
        };
      })
      .filter((row) => filter === "all" || row.listed === (filter === "listed"))
      .sort((a, b) => a.name.localeCompare(b.name, "en-IN", { sensitivity: "base" }));
    return {
      ok: true,
      rows,
      capped: applications.length >= TRAINER_LIST_LIMIT,
      bookingsNote: !bookings
        ? missingPermissionMessage("bookings.read", "The bookings column")
        : bookings.capped
          ? "Booking counts stop at the first 1000 bookings read, so some are floors."
          : null,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type TrainerApplicationSummary = {
  status: ApplicationStatus;
  fullName: string;
  city: string;
  modes: SessionMode[];
  reviewerNote: string | null;
};

export type TrainerDetailResult =
  | {
      ok: true;
      profile: TrainerProfileRow;
      services: ServiceRow[];
      rating: TrainerRatingSummaryRow | null;
      application: TrainerApplicationSummary | null;
      /** Null without documents.review. */
      documents: DocumentSummaryRow[] | null;
      specialtyOptions: CatalogueOptions;
      languageOptions: CatalogueOptions;
    }
  | { ok: false; error: string };

/** Active catalogue labels for a picker; free text when there are none or the read fails. */
async function loadCatalogueOptions(
  client: AppSupabaseClient,
  kind: CatalogueKind,
): Promise<CatalogueOptions> {
  try {
    const items = await listActiveCatalogue(client, kind);
    if (items.length === 0) {
      return { options: null, reason: "The catalogue has no active items for this list yet." };
    }
    return { options: items.map((item) => item.label) };
  } catch (error) {
    return { options: null, reason: `The catalogue could not be read: ${toAppError(error).message}` };
  }
}

export async function loadTrainerDetail(
  client: AppSupabaseClient,
  access: SessionAccess,
  trainerId: string,
): Promise<TrainerDetailResult> {
  if (!trainerIdSchema.safeParse(trainerId).success) {
    return { ok: false, error: "This trainer does not exist." };
  }
  try {
    const [profile, services, ratings, application, documents, specialtyOptions, languageOptions] =
      await Promise.all([
      getTrainerProfile(client, trainerId),
      listServices(client, trainerId),
      listRatingSummaries(client, [trainerId]),
      // A profile without an application is an old or hand-made account; the page says so.
      getApplication(client, trainerId).catch((error: unknown) => {
        if (toAppError(error).code === "BRNTF") return null;
        throw error;
      }),
      can(access.permissions, "documents.review")
        ? listDocuments(client, trainerId)
        : Promise.resolve(null),
      loadCatalogueOptions(client, "specialty"),
      loadCatalogueOptions(client, "language"),
    ]);
    return {
      ok: true,
      profile,
      services,
      rating: ratings.get(trainerId) ?? null,
      application: application
        ? {
            status: application.status,
            fullName: application.full_name,
            city: application.city,
            modes: application.modes,
            reviewerNote: application.reviewer_note,
          }
        : null,
      documents,
      specialtyOptions,
      languageOptions,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}
