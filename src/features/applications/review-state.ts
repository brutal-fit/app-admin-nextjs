/*
 * Where an application review stands, derived from what the server stored: the application
 * row, its documents and (with audit.read) the audit rows about the trainer. Pure functions,
 * shared by the review panel and its tests. Nothing here changes a status: the panel only
 * calls review_document, admin_request_documents and review_application.
 */
import { formatDateTime } from "@/features/applications/format";
import {
  APPLICATION_STATUS_LABELS,
  MODE_LABELS,
  PRICE_MAX_INR,
  PRICE_MIN_INR,
} from "@/features/applications/schemas";
import type { DocumentSummaryRow } from "@/lib/db/applications";
import type {
  ApplicationStatus,
  AuditLogRow,
  DocumentKind,
  Json,
  SessionMode,
} from "@/types/database";

/** The kinds review_application needs accepted before it approves (20261025034421). */
export const REQUIRED_DOCUMENT_KINDS = [
  "government_id",
  "certificate",
] as const satisfies readonly DocumentKind[];

export type RequiredDocumentKind = (typeof REQUIRED_DOCUMENT_KINDS)[number];

export type ReviewDocument = Pick<
  DocumentSummaryRow,
  "id" | "kind" | "file_name" | "size_bytes" | "status" | "note" | "created_at"
>;

const DECIDED_STATUSES: readonly ApplicationStatus[] = ["approved", "rejected", "suspended"];

export function isDecided(status: ApplicationStatus): boolean {
  return DECIDED_STATUSES.includes(status);
}

/**
 * The review as the audit log tells it. Only sessions with audit.read get one; without it the
 * panel falls back to the application row and the document statuses.
 */
export type ReviewHistory = {
  /** The first verdict, request or decision on the trainer: the review started then. */
  reviewStartedAt: string | null;
  /** Each time the application went back to the trainer, oldest first. */
  waitingTimes: string[];
  /** The latest rejection of each document kind (a verdict or a request naming the kind). */
  rejectedAt: Partial<Record<DocumentKind, string>>;
  /** The latest approve, reject or suspend. */
  decidedAt: string | null;
};

/** The audit actions the review writes (20261019000200, 20261019000500, 20261025034421). */
export const REVIEW_AUDIT_ACTIONS = [
  "trainer.review_start",
  "document.review",
  "trainer.request_documents",
  "review_application",
] as const;

function field(details: Json, key: string): Json | undefined {
  if (details === null || typeof details !== "object" || Array.isArray(details)) return undefined;
  return details[key];
}

function isDocumentKind(value: Json | undefined): value is DocumentKind {
  return value === "government_id" || value === "certificate" || value === "other";
}

function time(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function later(a: string | undefined, b: string): string {
  return a !== undefined && time(a) >= time(b) ? a : b;
}

/** Reads the review out of audit rows about one trainer, in any order. */
export function reviewHistoryFromAudit(
  rows: readonly Pick<AuditLogRow, "action" | "details" | "created_at">[],
): ReviewHistory {
  const history: ReviewHistory = {
    reviewStartedAt: null,
    waitingTimes: [],
    rejectedAt: {},
    decidedAt: null,
  };
  const sorted = [...rows]
    .filter((row) => (REVIEW_AUDIT_ACTIONS as readonly string[]).includes(row.action))
    .sort((a, b) => time(a.created_at) - time(b.created_at));
  for (const row of sorted) {
    const at = row.created_at;
    history.reviewStartedAt ??= at;
    if (row.action === "document.review") {
      const kind = field(row.details, "kind");
      if (field(row.details, "status") === "rejected") {
        history.waitingTimes.push(at);
        if (isDocumentKind(kind)) history.rejectedAt[kind] = later(history.rejectedAt[kind], at);
      }
    } else if (row.action === "trainer.request_documents") {
      history.waitingTimes.push(at);
      const kinds = field(row.details, "kinds");
      if (Array.isArray(kinds)) {
        for (const kind of kinds) {
          if (isDocumentKind(kind)) history.rejectedAt[kind] = later(history.rejectedAt[kind], at);
        }
      }
    } else if (row.action === "review_application") {
      const status = field(row.details, "status");
      if (status === "needs_information") history.waitingTimes.push(at);
      if (status === "approved" || status === "rejected" || status === "suspended") {
        history.decidedAt = at;
      }
    }
  }
  return history;
}

export type RequiredDocumentState = "missing" | "waiting" | "resubmitted" | "accepted" | "rejected";

export const REQUIRED_DOCUMENT_STATE_LABELS: Record<RequiredDocumentState, string> = {
  missing: "Missing",
  waiting: "Waiting",
  resubmitted: "Resubmitted",
  accepted: "Accepted",
  rejected: "Rejected",
};

export type RequiredDocumentRow = {
  kind: RequiredDocumentKind;
  state: RequiredDocumentState;
  /** The file the row stands for: the accepted one if any, else the latest. */
  document: ReviewDocument | null;
};

export type AttentionItem = { document: ReviewDocument; resubmitted: boolean };

export type ProgressStep = {
  key: "submitted" | "reviewing" | "waiting" | "decided";
  label: string;
  state: "done" | "current" | "upcoming";
  at: string | null;
  detail?: string;
};

export type ReviewState = {
  status: ApplicationStatus;
  decided: boolean;
  /** The trainer has the application back and the panel waits for them. */
  waitingNow: boolean;
  waitingSince: string | null;
  /** New files came back with a resubmission: the page shows a banner. */
  resubmitted: boolean;
  /** False without documents.review: the document sections say so instead. */
  documentsVisible: boolean;
  required: RequiredDocumentRow[];
  acceptedCount: number;
  /** Optional kinds and earlier copies, oldest first. */
  extras: ReviewDocument[];
  /** Files without a verdict yet, oldest first. */
  attention: AttentionItem[];
  /** Required kinds that are rejected or missing: what "Ask for documents" preselects. */
  askKinds: RequiredDocumentKind[];
  steps: ProgressStep[];
};

function byCreated(a: ReviewDocument, b: ReviewDocument): number {
  return time(a.created_at) - time(b.created_at) || a.id.localeCompare(b.id);
}

/**
 * The review state of one application. With a history the resubmission and waiting steps come
 * from the audit log; without one they are inferred from the row: an application that is
 * submitted again while some document already carries a verdict was sent back and returned
 * (a verdict on a submitted application moves it to under review, so only a resubmission
 * gets it back to submitted). Times the row cannot tell are left out rather than guessed.
 */
export function deriveReview(input: {
  status: ApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  documents: readonly ReviewDocument[] | null;
  history: ReviewHistory | null;
}): ReviewState {
  const { status, submittedAt, updatedAt, history } = input;
  const documents = [...(input.documents ?? [])].sort(byCreated);
  const decided = isDecided(status);
  const waitingNow = status === "needs_information";
  const anyVerdict = documents.some((doc) => doc.status !== "uploaded");
  const cameBackWithoutHistory = status === "submitted" && anyVerdict;

  function isResubmitted(doc: ReviewDocument): boolean {
    if (doc.status !== "uploaded") return false;
    if (!history) return cameBackWithoutHistory;
    const threshold = history.rejectedAt[doc.kind] ?? history.waitingTimes[0];
    return threshold !== undefined && time(doc.created_at) > time(threshold);
  }

  const representatives = new Set<string>();
  const required: RequiredDocumentRow[] = REQUIRED_DOCUMENT_KINDS.map((kind) => {
    const ofKind = documents.filter((doc) => doc.kind === kind);
    const accepted = ofKind.filter((doc) => doc.status === "accepted").at(-1);
    const document = accepted ?? ofKind.at(-1) ?? null;
    if (document) representatives.add(document.id);
    const state: RequiredDocumentState = !document
      ? "missing"
      : document.status === "accepted"
        ? "accepted"
        : document.status === "rejected"
          ? "rejected"
          : isResubmitted(document)
            ? "resubmitted"
            : "waiting";
    return { kind, state, document };
  });

  const attention = documents
    .filter((doc) => doc.status === "uploaded")
    .map((document) => ({ document, resubmitted: isResubmitted(document) }));

  const reviewStarted =
    history?.reviewStartedAt != null ||
    status === "under_review" ||
    waitingNow ||
    decided ||
    anyVerdict;
  const waitingOccurred =
    waitingNow || (history ? history.waitingTimes.length > 0 : cameBackWithoutHistory);
  const lastWaiting = history?.waitingTimes.at(-1) ?? null;
  const waitingSince = waitingNow ? (lastWaiting ?? updatedAt) : lastWaiting;
  const cameBack = waitingOccurred && !waitingNow && !decided;

  const steps: ProgressStep[] = [
    { key: "submitted", label: "Submitted", state: "upcoming", at: submittedAt },
    {
      key: "reviewing",
      label: "Reviewing",
      state: "upcoming",
      at: reviewStarted
        ? (history?.reviewStartedAt ?? (status === "under_review" ? updatedAt : null))
        : null,
    },
  ];
  if (waitingOccurred) {
    steps.push({
      key: "waiting",
      label: "Waiting for documents",
      state: "upcoming",
      at: waitingSince,
      detail:
        cameBack && submittedAt ? `Resubmitted ${formatDateTime(submittedAt)}` : undefined,
    });
  }
  steps.push({
    key: "decided",
    label: decided ? APPLICATION_STATUS_LABELS[status] : "Decided",
    state: "upcoming",
    at: decided ? (history?.decidedAt ?? updatedAt) : null,
  });

  // The step the application is on; after a resubmission everything up to the waiting step is
  // done and the decision is next, so no step is current.
  const currentKey: ProgressStep["key"] | null =
    status === "draft"
      ? null
      : decided
        ? "decided"
        : waitingNow
          ? "waiting"
          : cameBack
            ? null
            : reviewStarted
              ? "reviewing"
              : "submitted";
  const lastDone = cameBack ? steps.findIndex((step) => step.key === "waiting") : -1;
  const currentIndex = steps.findIndex((step) => step.key === currentKey);
  steps.forEach((step, index) => {
    if (status === "draft") step.state = "upcoming";
    else if (index === currentIndex) step.state = "current";
    else if (index < currentIndex || index <= lastDone) step.state = "done";
  });

  const documentsVisible = input.documents !== null;
  return {
    status,
    decided,
    waitingNow,
    waitingSince,
    resubmitted: !waitingNow && !decided && attention.some((item) => item.resubmitted),
    documentsVisible,
    required,
    acceptedCount: required.filter((row) => row.state === "accepted").length,
    extras: documents.filter((doc) => !representatives.has(doc.id)),
    attention,
    askKinds: documentsVisible
      ? required.filter((row) => row.state === "rejected" || row.state === "missing").map((row) => row.kind)
      : [],
    steps,
  };
}

/** A price field: blank is no price; anything else must be a whole rupee amount in range. */
export function parsePriceInput(value: string): { value: number | null; error: string | null } {
  const trimmed = value.trim();
  if (trimmed === "") return { value: null, error: null };
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) return { value: null, error: "Prices are whole rupees." };
  if (parsed < PRICE_MIN_INR) return { value: null, error: `Prices start at INR ${PRICE_MIN_INR}.` };
  if (parsed > PRICE_MAX_INR) return { value: null, error: `Prices stop at INR ${PRICE_MAX_INR}.` };
  return { value: parsed, error: null };
}

export type DecisionPlan =
  | { primary: "ask"; kinds: RequiredDocumentKind[] }
  | {
      primary: "approve";
      /** Why Approve is disabled; null when it can be pressed. */
      blocker: string | null;
      prices: { home: number | null; online: number | null };
    };

/**
 * The one primary action: "Ask for documents" while a required document is rejected or
 * missing, else "Approve", enabled once both documents are accepted and every offered mode
 * has a valid price. The same rules review_application enforces (20261025034421).
 */
export function decisionPlan(
  review: ReviewState,
  modes: readonly SessionMode[],
  priceInputs: { home: string; online: string },
): DecisionPlan {
  if (review.askKinds.length > 0) return { primary: "ask", kinds: review.askKinds };
  const home = modes.includes("home") ? parsePriceInput(priceInputs.home) : null;
  const online = modes.includes("online") ? parsePriceInput(priceInputs.online) : null;
  const prices = { home: home?.value ?? null, online: online?.value ?? null };
  if (review.documentsVisible && review.acceptedCount < REQUIRED_DOCUMENT_KINDS.length) {
    return {
      primary: "approve",
      blocker: "Accept the government ID and the certificate first.",
      prices,
    };
  }
  const invalid = home?.error ?? online?.error ?? null;
  if (invalid) return { primary: "approve", blocker: invalid, prices };
  const missing: SessionMode[] = [];
  if (home && home.value === null) missing.push("home");
  if (online && online.value === null) missing.push("online");
  if (missing.length > 0) {
    const names = missing.map((mode) => MODE_LABELS[mode].toLowerCase()).join(" and ");
    return {
      primary: "approve",
      blocker: `Set the ${names} price${missing.length > 1 ? "s" : ""} to approve.`,
      prices,
    };
  }
  return { primary: "approve", blocker: null, prices };
}
