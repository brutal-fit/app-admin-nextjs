/*
 * Server-side loaders for the applications pages. They compose the data layer
 * (src/lib/db) and decide what the session may see, so pages stay thin. Not for client
 * components: they need the server Supabase client.
 */
import {
  getApplication,
  listApplications,
  listAvailability,
  listDocuments,
  type ApplicationSummaryRow,
  type DocumentSummaryRow,
} from "@/lib/db/applications";
import { getUser } from "@/lib/db/rbac";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type { AvailabilityWindowRow, TrainerApplicationRow } from "@/types/database";
import {
  APPLICATION_LIST_LIMIT,
  trainerIdSchema,
  type ApplicationFilter,
} from "@/features/applications/schemas";

/**
 * A username is readable only through admin_get_user, which needs users.read. `undefined`
 * means the session cannot see it; `null` means the trainer has not picked one.
 */
export type Username = string | null | undefined;

export type ApplicationListItem = {
  trainerId: string;
  fullName: string;
  username: Username;
  city: string;
  modes: ApplicationSummaryRow["modes"];
  submittedAt: string | null;
  status: ApplicationSummaryRow["status"];
};

export type ApplicationListResult =
  | {
      ok: true;
      rows: ApplicationListItem[];
      truncated: boolean;
      usernamesVisible: boolean;
    }
  | { ok: false; error: string };

export type ApplicationDetailResult =
  | {
      ok: true;
      application: TrainerApplicationRow;
      username: Username;
      /** Null when the session lacks documents.review (RLS would return no rows anyway). */
      documents: DocumentSummaryRow[] | null;
      availability: AvailabilityWindowRow[];
    }
  | { ok: false; error: string };

async function lookupUsernames(
  client: AppSupabaseClient,
  trainerIds: readonly string[],
): Promise<Map<string, string | null>> {
  // admin_list_users caps a page at 200 and cannot filter by id, so each trainer is fetched
  // on its own; a failed lookup shows as no username rather than failing the page.
  const results = await Promise.allSettled(trainerIds.map((id) => getUser(client, id)));
  const usernames = new Map<string, string | null>();
  results.forEach((result, index) => {
    const id = trainerIds[index];
    if (id !== undefined) {
      usernames.set(id, result.status === "fulfilled" ? (result.value.username ?? null) : null);
    }
  });
  return usernames;
}

export async function loadApplicationList(
  client: AppSupabaseClient,
  access: SessionAccess,
  filter: ApplicationFilter,
): Promise<ApplicationListResult> {
  try {
    const rows = await listApplications(client, {
      status: filter === "all" ? null : filter,
      limit: APPLICATION_LIST_LIMIT,
    });
    const usernamesVisible = can(access.permissions, "users.read");
    const usernames = usernamesVisible
      ? await lookupUsernames(
          client,
          rows.map((row) => row.trainer_id),
        )
      : new Map<string, string | null>();
    return {
      ok: true,
      truncated: rows.length >= APPLICATION_LIST_LIMIT,
      usernamesVisible,
      rows: rows.map((row) => ({
        trainerId: row.trainer_id,
        fullName: row.full_name,
        username: usernamesVisible ? (usernames.get(row.trainer_id) ?? null) : undefined,
        city: row.city,
        modes: row.modes,
        submittedAt: row.submitted_at,
        status: row.status,
      })),
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export async function loadApplicationDetail(
  client: AppSupabaseClient,
  access: SessionAccess,
  trainerId: string,
): Promise<ApplicationDetailResult> {
  if (!trainerIdSchema.safeParse(trainerId).success) {
    return { ok: false, error: "This application does not exist." };
  }
  try {
    const canSeeDocuments = can(access.permissions, "documents.review");
    const canSeeUsername = can(access.permissions, "users.read");
    const [application, documents, availability, usernames] = await Promise.all([
      getApplication(client, trainerId),
      canSeeDocuments ? listDocuments(client, trainerId) : Promise.resolve(null),
      listAvailability(client, trainerId),
      canSeeUsername ? lookupUsernames(client, [trainerId]) : Promise.resolve(null),
    ]);
    return {
      ok: true,
      application,
      username: usernames ? (usernames.get(trainerId) ?? null) : undefined,
      documents,
      availability,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}
