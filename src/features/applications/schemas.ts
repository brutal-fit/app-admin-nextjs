import { z } from "zod";
import type {
  ApplicationStatus,
  DocumentKind,
  DocumentStatus,
  ExperienceBand,
  SessionMode,
} from "@/types/database";

/** Filter chips on the list, in display order. "all" means every non-draft application. */
export const APPLICATION_FILTERS = [
  "all",
  "submitted",
  "under_review",
  "needs_information",
  "approved",
  "rejected",
  "suspended",
] as const;

/** Statuses that still wait for ops: the dashboard tile and the "Awaiting review" filter. */
export const AWAITING_REVIEW_STATUSES = [
  "submitted",
  "under_review",
] as const satisfies readonly ApplicationStatus[];

/** Filters that span several statuses, shown as quick filters beside the status chips. */
export const APPLICATION_QUICK_FILTERS = ["awaiting_review"] as const;

export type ApplicationFilter =
  | (typeof APPLICATION_FILTERS)[number]
  | (typeof APPLICATION_QUICK_FILTERS)[number];

/**
 * The statuses review_application accepts. Under review is not one: the first document
 * verdict starts the review on the server (20261025034421).
 */
export const REVIEW_DECISIONS = [
  "needs_information",
  "approved",
  "rejected",
  "suspended",
] as const satisfies readonly ApplicationStatus[];

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/** The fixed list of checks ops can mark as verified on the public profile. */
export const VERIFIED_CHECKS = ["government_id", "certificate", "in_person"] as const;

export type VerifiedCheck = (typeof VERIFIED_CHECKS)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  needs_information: "Needs information",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const FILTER_LABELS: Record<ApplicationFilter, string> = {
  all: "All",
  awaiting_review: "Awaiting review",
  ...APPLICATION_STATUS_LABELS,
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Waiting for review",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  government_id: "Government ID",
  certificate: "Certificate",
  other: "Other",
};

export const VERIFIED_CHECK_LABELS: Record<VerifiedCheck, string> = {
  government_id: "Government ID",
  certificate: "Certificate",
  in_person: "Met in person",
};

export const MODE_LABELS: Record<SessionMode, string> = {
  home: "Home",
  online: "Online",
};

export const EXPERIENCE_LABELS: Record<ExperienceBand, string> = {
  just_starting: "Just starting",
  "1_3": "1 to 3 years",
  "3_5": "3 to 5 years",
  "5_10": "5 to 10 years",
  "10_plus": "10 years or more",
};

/** The list page shows at most this many rows; the page says so when it hits the cap. */
export const APPLICATION_LIST_LIMIT = 200;

/** Reads the `?status=` search param; anything unknown falls back to "all". */
export function parseApplicationFilter(value: string | string[] | undefined): ApplicationFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  const known: readonly string[] = [...APPLICATION_FILTERS, ...APPLICATION_QUICK_FILTERS];
  return known.includes(raw ?? "") ? (raw as ApplicationFilter) : "all";
}

/** The statuses a filter lists; null means every non-draft status. */
export function filterStatuses(filter: ApplicationFilter): readonly ApplicationStatus[] | null {
  if (filter === "all") return null;
  if (filter === "awaiting_review") return AWAITING_REVIEW_STATUSES;
  return [filter];
}

/** Reads `?documents=unreviewed`: only trainers with a document waiting for review. */
export function parseDocumentsFilter(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "unreviewed";
}

/** The list URL for a filter combination; the dashboard tiles link here too. */
export function applicationListHref(filter: ApplicationFilter, unreviewedDocuments = false): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (unreviewedDocuments) params.set("documents", "unreviewed");
  const query = params.toString();
  return query ? `/applications?${query}` : "/applications";
}

// Same range as the services.price_inr and expected-rate checks in the database.
export const PRICE_MIN_INR = 1;
export const PRICE_MAX_INR = 100000;

const priceInr = z
  .number({ error: "Prices are whole rupees." })
  .int("Prices are whole rupees.")
  .min(PRICE_MIN_INR, `Prices start at INR ${PRICE_MIN_INR}.`)
  .max(PRICE_MAX_INR, `Prices stop at INR ${PRICE_MAX_INR}.`)
  .nullable();

const note = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep the note to ${max} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

export const trainerIdSchema = z.guid("Unknown application.");

/**
 * Approving publishes the trainer at the platform price, so every mode they offer needs a
 * price. Shared by the review panel and the server action (which reads the modes from the
 * database); review_application refuses it too since 20261025034421.
 */
export function missingPriceMessage(
  status: ReviewDecision | "",
  modes: readonly SessionMode[],
  prices: { home: number | null; online: number | null },
): string | null {
  if (status !== "approved") return null;
  if (modes.includes("home") && prices.home === null) {
    return "Enter the platform price for home sessions before approving.";
  }
  if (modes.includes("online") && prices.online === null) {
    return "Enter the platform price for online sessions before approving.";
  }
  return null;
}

/** Decisions the trainer must be told the reason for; the server requires it for the first. */
const NOTE_REQUIRED: Partial<Record<ReviewDecision, string>> = {
  needs_information: "Say what is missing.",
  rejected: "Say why the application is rejected.",
};

export const reviewApplicationSchema = z
  .object({
    trainerId: trainerIdSchema,
    status: z.enum(REVIEW_DECISIONS, { error: "Choose a decision." }),
    note: note(1000),
    homeRateInr: priceInr,
    onlineRateInr: priceInr,
    verifiedChecks: z.array(z.enum(VERIFIED_CHECKS, { error: "Unknown check." })).max(3),
  })
  .superRefine((value, context) => {
    const message = NOTE_REQUIRED[value.status];
    if (message && value.note === null) {
      context.addIssue({ code: "custom", path: ["note"], message });
    }
  });

export type ReviewApplicationInput = z.input<typeof reviewApplicationSchema>;

export const reviewDocumentSchema = z.object({
  documentId: z.guid("Unknown document."),
  status: z.enum(["accepted", "rejected"], { error: "Choose accept or reject." }),
  note: note(500),
});

export type ReviewDocumentInput = z.input<typeof reviewDocumentSchema>;

export const openDocumentSchema = z.object({ documentId: z.guid("Unknown document.") });
