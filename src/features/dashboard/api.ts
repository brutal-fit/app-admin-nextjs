/*
 * Server-side loaders for the dashboard. Each section settles on its own, so one missing
 * permission or function never blanks the page. Every number is a query; a tile the session
 * cannot read says which permission it needs instead of showing a zero.
 */
import {
  countApplications,
  countUnreviewedDocuments,
  listApplicantNames,
  listApplications,
} from "@/lib/db/applications";
import {
  countBookingsStarting,
  countOpenSafetyCases,
  countOpenSupportCases,
  countPendingBookingRequests,
  listAudit,
} from "@/lib/db/dashboard";
import { getUser, listUsers } from "@/lib/db/rbac";
import { countReportedReviews } from "@/lib/db/reviews";
import { can } from "@/lib/rbac/can";
import { PERMISSIONS, type PermissionKey } from "@/lib/rbac/permissions";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import {
  daysAgoIso,
  formatRelativeTime,
  formatWaiting,
  istDateString,
  istDayRange,
} from "@/lib/utils/time";
import type { SessionAccess } from "@/types/access";
import type { ApplicationStatus, SessionMode } from "@/types/database";
import {
  AWAITING_REVIEW_STATUSES,
  applicationListHref,
} from "@/features/applications/schemas";
import { EMPTY_BOOKING_FILTERS, bookingListHref } from "@/features/bookings/schemas";
import { EMPTY_REVIEW_FILTERS, reviewListHref } from "@/features/reviews/schemas";
import { EMPTY_SUPPORT_FILTERS, supportListHref } from "@/features/support/schemas";
import { USER_MAX_PAGE } from "@/features/users/schemas";
import {
  APPLICATION_TARGET_ACTIONS,
  USER_TARGET_ACTIONS,
  describeAuditEntry,
  type ActivityTarget,
} from "@/features/dashboard/format";

export type TileValue =
  | {
      kind: "count";
      value: number;
      /** The function's page cap was reached: the number is a floor, shown with "+". */
      capped?: boolean;
      /** A breakdown that replaces the tile's hint, such as "2 submitted, 1 under review." */
      detail?: string;
    }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; message: string };

export type TileId =
  | "safety"
  | "applications"
  | "documents"
  | "support"
  | "bookings-today"
  | "booking-requests"
  | "reported-reviews"
  | "new-users";

export type DashboardTile = {
  id: TileId;
  label: string;
  /** One line under the number: what is counted, or a breakdown. */
  hint: string;
  /** The filtered page this tile opens; null when the panel has no such page yet. */
  href: string | null;
  /** Shown instead of the link when href is null. */
  linkNote?: string;
  /** Work waiting on ops: a non-zero count is highlighted. */
  urgent: boolean;
  value: TileValue;
};

export const REVIEW_QUEUE_SIZE = 5;
export const ACTIVITY_SIZE = 8;

function permissionName(key: PermissionKey): string {
  return PERMISSIONS.find((permission) => permission.key === key)?.name ?? key;
}

function needs(key: PermissionKey): TileValue {
  return { kind: "hidden", reason: `Needs the ${permissionName(key)} permission.` };
}

async function settle(load: () => Promise<TileValue>): Promise<TileValue> {
  try {
    return await load();
  } catch (error) {
    return { kind: "error", message: toAppError(error).message };
  }
}

export async function loadDashboardTiles(
  client: AppSupabaseClient,
  access: SessionAccess,
  now: number,
): Promise<DashboardTile[]> {
  const allowed = (key: PermissionKey) => can(access.permissions, key);
  const today = istDateString(now);

  const [
    safety,
    applications,
    documents,
    support,
    bookingsToday,
    bookingRequests,
    reportedReviews,
    newUsers,
  ] = await Promise.all([
      allowed("support.read")
        ? settle(async () => ({ kind: "count", value: await countOpenSafetyCases(client) }))
        : Promise.resolve(needs("support.read")),
      allowed("applications.read")
        ? settle(async () => {
            const [submitted, underReview] = await Promise.all([
              countApplications(client, ["submitted"]),
              countApplications(client, ["under_review"]),
            ]);
            return {
              kind: "count",
              value: submitted + underReview,
              detail: `${submitted} submitted, ${underReview} under review.`,
            };
          })
        : Promise.resolve(needs("applications.read")),
      allowed("documents.review")
        ? settle(async () => ({ kind: "count", value: await countUnreviewedDocuments(client) }))
        : Promise.resolve(needs("documents.review")),
      allowed("support.read")
        ? settle(async () => ({ kind: "count", value: await countOpenSupportCases(client) }))
        : Promise.resolve(needs("support.read")),
      allowed("bookings.read")
        ? settle(async () => ({
            kind: "count",
            value: await countBookingsStarting(client, istDayRange(now)),
          }))
        : Promise.resolve(needs("bookings.read")),
      allowed("bookings.read")
        ? settle(async () => ({ kind: "count", value: await countPendingBookingRequests(client) }))
        : Promise.resolve(needs("bookings.read")),
      allowed("reviews.moderate")
        ? settle(async () => {
            // admin_list_reviews returns at most 200 rows; a full page shows as "200+".
            const reported = await countReportedReviews(client);
            return { kind: "count", value: reported.count, capped: reported.capped };
          })
        : Promise.resolve(needs("reviews.moderate")),
      allowed("users.read")
        ? settle(async () => {
            // No count function exists: the newest page (the function's 200-row cap) is read
            // and counted, and a full page of new users shows as "200+".
            const since = daysAgoIso(7, now);
            const rows = await listUsers(client, { query: "", limit: USER_MAX_PAGE, offset: 0 });
            const recent = rows.filter((row) => row.created_at >= since).length;
            return { kind: "count", value: recent, capped: recent >= USER_MAX_PAGE };
          })
        : Promise.resolve(needs("users.read")),
    ]);

  const tiles: DashboardTile[] = [];
  // The safety tile shows only when there is something to see (or the count failed): a
  // zero would only push the other tiles around, and without support.read it cannot know.
  if (safety.kind === "error" || (safety.kind === "count" && safety.value > 0)) {
    tiles.push({
      id: "safety",
      label: "Safety cases open",
      hint: "Safety reports not yet resolved or closed.",
      href: supportListHref(EMPTY_SUPPORT_FILTERS, { category: "safety" }),
      urgent: true,
      value: safety,
    });
  }

  return [
    ...tiles,
    {
      id: "applications",
      label: "Applications awaiting review",
      hint: "Submitted or under review.",
      href: applicationListHref("awaiting_review"),
      urgent: true,
      value: applications,
    },
    {
      id: "documents",
      label: "Documents to review",
      hint: "Uploaded, not yet accepted or rejected.",
      href: applicationListHref("all", true),
      urgent: true,
      value: documents,
    },
    {
      id: "support",
      label: "Open support cases",
      hint: "Every case not resolved or closed.",
      href: supportListHref(EMPTY_SUPPORT_FILTERS, { status: "open" }),
      urgent: true,
      value: support,
    },
    {
      id: "bookings-today",
      label: "Bookings today",
      hint: "Starting today, India time, not cancelled. The list also shows cancelled ones.",
      href: bookingListHref(EMPTY_BOOKING_FILTERS, { from: today, to: today }),
      urgent: false,
      value: bookingsToday,
    },
    {
      id: "booking-requests",
      label: "Booking requests pending",
      hint: "Requested by a client, not yet answered by the trainer.",
      href: bookingListHref(EMPTY_BOOKING_FILTERS, { status: "requested" }),
      urgent: false,
      value: bookingRequests,
    },
    {
      id: "reported-reviews",
      label: "Reported reviews",
      hint: "Reviews with an open support report.",
      href: reviewListHref(EMPTY_REVIEW_FILTERS, { reported: "yes" }),
      urgent: true,
      value: reportedReviews,
    },
    {
      id: "new-users",
      label: "New users, last 7 days",
      hint: "Accounts created in the past seven days.",
      href: "/users?joined=week",
      urgent: false,
      value: newUsers,
    },
  ];
}

export type ReviewQueueItem = {
  trainerId: string;
  fullName: string;
  city: string;
  modes: SessionMode[];
  status: ApplicationStatus;
  submittedAt: string | null;
  waiting: string | null;
};

export type ReviewQueueResult =
  | { kind: "ok"; items: ReviewQueueItem[] }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; message: string };

export async function loadReviewQueue(
  client: AppSupabaseClient,
  access: SessionAccess,
  now: number,
): Promise<ReviewQueueResult> {
  if (!can(access.permissions, "applications.read")) {
    return { kind: "hidden", reason: `The queue needs the ${permissionName("applications.read")} permission.` };
  }
  try {
    const rows = await listApplications(client, {
      statuses: AWAITING_REVIEW_STATUSES,
      limit: REVIEW_QUEUE_SIZE,
      oldestFirst: true,
    });
    return {
      kind: "ok",
      items: rows.map((row) => ({
        trainerId: row.trainer_id,
        fullName: row.full_name,
        city: row.city,
        modes: row.modes,
        status: row.status,
        submittedAt: row.submitted_at,
        waiting: row.submitted_at ? formatWaiting(row.submitted_at, now) : null,
      })),
    };
  } catch (error) {
    return { kind: "error", message: toAppError(error).message };
  }
}

export type ActivityItem = {
  id: number;
  actorName: string;
  verb: string;
  target: ActivityTarget | null;
  at: string;
  relative: string;
};

export type ActivityResult =
  | { kind: "ok"; items: ActivityItem[] }
  | { kind: "hidden"; reason: string }
  | { kind: "coming"; reason: string }
  | { kind: "error"; message: string };

export async function loadActivity(
  client: AppSupabaseClient,
  access: SessionAccess,
  now: number,
): Promise<ActivityResult> {
  if (!can(access.permissions, "audit.read")) {
    return { kind: "hidden", reason: `The feed needs the ${permissionName("audit.read")} permission.` };
  }
  try {
    const rows = await listAudit(client, ACTIVITY_SIZE);
    const canOpenUsers = can(access.permissions, "users.read");
    const canOpenApplications = can(access.permissions, "applications.read");
    const userIds = canOpenUsers
      ? [...new Set(rows.filter((row) => USER_TARGET_ACTIONS.has(row.action) && row.target_id).map((row) => row.target_id as string))]
      : [];
    const applicantIds = canOpenApplications
      ? [...new Set(rows.filter((row) => APPLICATION_TARGET_ACTIONS.has(row.action) && row.target_id).map((row) => row.target_id as string))]
      : [];
    // Names make the feed readable; a failed lookup only falls back to "a user".
    const [users, applicants] = await Promise.all([
      Promise.allSettled(userIds.map((id) => getUser(client, id))),
      listApplicantNames(client, applicantIds).catch(() => new Map<string, string>()),
    ]);
    const userNames = new Map<string, string>();
    users.forEach((result) => {
      if (result.status === "fulfilled" && result.value.full_name) {
        userNames.set(result.value.id, result.value.full_name);
      }
    });
    const context = {
      userNames,
      applicantNames: applicants,
      canOpenRoles: can(access.permissions, "rbac.manage"),
      canOpenUsers,
      canOpenApplications,
    };
    return {
      kind: "ok",
      items: rows.map((row) => {
        const description = describeAuditEntry(row, context);
        return {
          id: row.id,
          actorName: row.actor_name || "Someone",
          verb: description.verb,
          target: description.target,
          at: row.created_at,
          relative: formatRelativeTime(row.created_at, now),
        };
      }),
    };
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_INSTALLED") {
      return {
        kind: "coming",
        reason: "The audit feed is coming: admin_list_audit is not installed on this database yet.",
      };
    }
    return { kind: "error", message: appError.message };
  }
}
