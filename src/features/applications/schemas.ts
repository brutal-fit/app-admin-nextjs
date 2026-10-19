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

export type ApplicationFilter = (typeof APPLICATION_FILTERS)[number];

/** The statuses review_application accepts (it refuses draft and submitted with BRVAL). */
export const REVIEW_DECISIONS = [
  "under_review",
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
  return (APPLICATION_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as ApplicationFilter)
    : "all";
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
 * price. Shared by the decision form and the server action (which reads the modes from the
 * database). review_application itself accepts a missing price and keeps any earlier one.
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

export const reviewApplicationSchema = z.object({
  trainerId: trainerIdSchema,
  status: z.enum(REVIEW_DECISIONS, { error: "Choose a decision." }),
  note: note(1000),
  homeRateInr: priceInr,
  onlineRateInr: priceInr,
  verifiedChecks: z.array(z.enum(VERIFIED_CHECKS, { error: "Unknown check." })).max(3),
});

export type ReviewApplicationInput = z.input<typeof reviewApplicationSchema>;

export const reviewDocumentSchema = z.object({
  documentId: z.guid("Unknown document."),
  status: z.enum(["accepted", "rejected"], { error: "Choose accept or reject." }),
  note: note(500),
});

export type ReviewDocumentInput = z.input<typeof reviewDocumentSchema>;

export const openDocumentSchema = z.object({ documentId: z.guid("Unknown document.") });
