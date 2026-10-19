/*
 * The trainer applications data layer: the only file in src/ that spells the table, bucket
 * and function names for application and document review. Every wrapper throws AppError
 * (via toAppError) on failure. Reads go through RLS with the admin's own session:
 * trainer_applications needs applications.read, trainer_documents and the bucket need
 * documents.review (20261019000300_rbac_round2.sql); without them rows are filtered out.
 */
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  ApplicationStatus,
  AvailabilityWindowRow,
  SessionMode,
  TrainerApplicationRow,
  TrainerDocumentRow,
} from "@/types/database";

const TABLE = {
  applications: "trainer_applications",
  documents: "trainer_documents",
  availability: "availability_windows",
} as const;

const RPC = {
  reviewApplication: "review_application",
  reviewDocument: "review_document",
} as const;

const BUCKET = { documents: "trainer-documents" } as const;

/** Signed document links expire after five minutes; they are fetched per click. */
export const SIGNED_URL_TTL_SECONDS = 300;

export type ApplicationSummaryRow = Pick<
  TrainerApplicationRow,
  "trainer_id" | "full_name" | "city" | "modes" | "submitted_at" | "status"
>;

/**
 * Applications for the review list. Drafts are never listed: a draft has not been sent to
 * BRUTAL yet. `statuses` null means every non-draft status; `trainerIds` narrows the list to
 * those trainers (an empty array returns nothing without a query).
 */
export async function listApplications(
  client: AppSupabaseClient,
  input: {
    statuses: readonly ApplicationStatus[] | null;
    limit: number;
    trainerIds?: readonly string[] | null;
    /** Oldest submission first (a review queue) instead of newest first. */
    oldestFirst?: boolean;
  },
): Promise<ApplicationSummaryRow[]> {
  if (input.trainerIds && input.trainerIds.length === 0) return [];
  let query = client
    .from(TABLE.applications)
    .select("trainer_id, full_name, city, modes, submitted_at, status")
    .neq("status", "draft");
  if (input.statuses) query = query.in("status", [...input.statuses]);
  if (input.trainerIds) query = query.in("trainer_id", [...input.trainerIds]);
  const { data, error } = await query
    .order("submitted_at", { ascending: input.oldestFirst ?? false, nullsFirst: false })
    .order("trainer_id")
    .limit(input.limit);
  if (error) throw toAppError(error);
  return data;
}

/** How many non-draft applications are in these statuses (a head count, no rows). */
export async function countApplications(
  client: AppSupabaseClient,
  statuses: readonly ApplicationStatus[],
): Promise<number> {
  const { count, error } = await client
    .from(TABLE.applications)
    .select("trainer_id", { count: "exact", head: true })
    .in("status", [...statuses]);
  if (error) throw toAppError(error);
  return count ?? 0;
}

/** Applicant names for a set of trainers (activity feed targets). */
export async function listApplicantNames(
  client: AppSupabaseClient,
  trainerIds: readonly string[],
): Promise<Map<string, string>> {
  if (trainerIds.length === 0) return new Map();
  const { data, error } = await client
    .from(TABLE.applications)
    .select("trainer_id, full_name")
    .in("trainer_id", [...trainerIds]);
  if (error) throw toAppError(error);
  return new Map(data.map((row) => [row.trainer_id, row.full_name]));
}

/** Documents uploaded and not yet accepted or rejected (a head count). */
export async function countUnreviewedDocuments(client: AppSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from(TABLE.documents)
    .select("id", { count: "exact", head: true })
    .eq("status", "uploaded");
  if (error) throw toAppError(error);
  return count ?? 0;
}

// Enough for every trainer with a pending document at today's scale; the list says when hit.
export const UNREVIEWED_DOCUMENT_SCAN_LIMIT = 1000;

/** Trainers with at least one document waiting for review, for the list's document filter. */
export async function listTrainerIdsWithUnreviewedDocuments(
  client: AppSupabaseClient,
): Promise<string[]> {
  const { data, error } = await client
    .from(TABLE.documents)
    .select("trainer_id")
    .eq("status", "uploaded")
    .limit(UNREVIEWED_DOCUMENT_SCAN_LIMIT);
  if (error) throw toAppError(error);
  return [...new Set(data.map((row) => row.trainer_id))];
}

export async function getApplication(
  client: AppSupabaseClient,
  trainerId: string,
): Promise<TrainerApplicationRow> {
  const { data, error } = await client
    .from(TABLE.applications)
    .select("*")
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This application does not exist.");
  return data;
}

/** The modes the trainer offers, read fresh so the price rule never trusts the client. */
export async function getApplicationModes(
  client: AppSupabaseClient,
  trainerId: string,
): Promise<SessionMode[]> {
  const { data, error } = await client
    .from(TABLE.applications)
    .select("modes")
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This application does not exist.");
  return data.modes;
}

/** A document as the panel shows it; the storage path stays on the server. */
export type DocumentSummaryRow = Omit<TrainerDocumentRow, "storage_path">;

export async function listDocuments(
  client: AppSupabaseClient,
  trainerId: string,
): Promise<DocumentSummaryRow[]> {
  const { data, error } = await client
    .from(TABLE.documents)
    .select("id, trainer_id, kind, file_name, size_bytes, status, note, created_at")
    .eq("trainer_id", trainerId)
    .order("created_at");
  if (error) throw toAppError(error);
  return data;
}

export async function listAvailability(
  client: AppSupabaseClient,
  trainerId: string,
): Promise<AvailabilityWindowRow[]> {
  const { data, error } = await client
    .from(TABLE.availability)
    .select("*")
    .eq("trainer_id", trainerId)
    .order("weekday")
    .order("start_minute");
  if (error) throw toAppError(error);
  return data;
}

/**
 * A short-lived link to one document. The storage path is looked up by id on the server so
 * the client never names a path, and the link is signed with the admin's session, so the
 * bucket policy (documents.review) decides.
 */
export async function createDocumentSignedUrl(
  client: AppSupabaseClient,
  documentId: string,
): Promise<string> {
  const { data, error } = await client
    .from(TABLE.documents)
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "Document not found.");
  const signed = await client.storage
    .from(BUCKET.documents)
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signed.error) {
    // Storage errors carry no SQLSTATE; a missing object is the one case worth naming.
    if (/not found/i.test(signed.error.message)) {
      throw new AppError("BRNTF", "This file is no longer in storage.");
    }
    throw new AppError("UNKNOWN", "Could not open this document. Try again.");
  }
  return signed.data.signedUrl;
}

export async function reviewApplication(
  client: AppSupabaseClient,
  input: {
    trainerId: string;
    status: ApplicationStatus;
    note: string | null;
    homeRateInr: number | null;
    onlineRateInr: number | null;
    verifiedChecks: string[] | null;
  },
): Promise<void> {
  const { error } = await client.rpc(RPC.reviewApplication, {
    p_trainer: input.trainerId,
    p_status: input.status,
    p_note: input.note,
    p_home_rate_inr: input.homeRateInr,
    p_online_rate_inr: input.onlineRateInr,
    p_verified_checks: input.verifiedChecks,
    // Null keeps whatever tags the profile already has; the panel does not edit them yet.
    p_availability_tags: null,
  });
  if (error) throw toAppError(error);
}

export async function reviewDocument(
  client: AppSupabaseClient,
  input: { documentId: string; status: "accepted" | "rejected"; note: string | null },
): Promise<void> {
  const { error } = await client.rpc(RPC.reviewDocument, {
    p_document: input.documentId,
    p_status: input.status,
    p_note: input.note,
  });
  if (error) throw toAppError(error);
}
