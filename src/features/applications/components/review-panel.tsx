"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlertCircle, Clock, FileText } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ApproveDialog } from "@/features/applications/components/approve-dialog";
import { DocumentReviewRow } from "@/features/applications/components/document-review-row";
import { ProgressStrip } from "@/features/applications/components/progress-strip";
import { RejectApplicationDialog } from "@/features/applications/components/reject-application-dialog";
import {
  documentStatusTone,
  formatDateTime,
  formatInr,
  requiredDocumentTone,
} from "@/features/applications/format";
import {
  REQUIRED_DOCUMENT_KINDS,
  REQUIRED_DOCUMENT_STATE_LABELS,
  decisionPlan,
  deriveReview,
  type ReviewDocument,
  type ReviewHistory,
  type ReviewState,
} from "@/features/applications/review-state";
import {
  APPLICATION_STATUS_LABELS,
  DOCUMENT_KIND_LABELS,
  DOCUMENT_STATUS_LABELS,
  MODE_LABELS,
  PRICE_MAX_INR,
  PRICE_MIN_INR,
  VERIFIED_CHECKS,
  VERIFIED_CHECK_LABELS,
  type VerifiedCheck,
} from "@/features/applications/schemas";
import { RequestDocumentsDialog } from "@/features/trainers/components/request-documents-dialog";
import type { TrainerApplicationRow } from "@/types/database";

export type ReviewPanelApplication = Pick<
  TrainerApplicationRow,
  | "trainer_id"
  | "full_name"
  | "status"
  | "modes"
  | "expected_home_rate_inr"
  | "expected_online_rate_inr"
  | "submitted_at"
  | "updated_at"
  | "reviewer_note"
>;

function PanelSection({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="text-sm font-semibold">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** "2 of 2 accepted" with a ring that fills as documents are accepted. */
function AcceptedRing({ accepted, total }: { accepted: number; total: number }) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const share = total === 0 ? 0 : accepted / total;
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
        <circle cx="10" cy="10" r={radius} fill="none" strokeWidth="3" className="stroke-border" />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
          className={cn("transition-[stroke-dashoffset]", share === 1 ? "stroke-success" : "stroke-primary")}
        />
      </svg>
      {accepted} of {total} accepted
    </span>
  );
}

function documentTitle(document: ReviewDocument, review: ReviewState): string {
  const copies = review.required.some(
    (row) => row.kind === document.kind && row.document && row.document.id !== document.id,
  );
  return copies ? `${DOCUMENT_KIND_LABELS[document.kind]} (earlier file)` : DOCUMENT_KIND_LABELS[document.kind];
}

function newFileLine(document: ReviewDocument): string {
  return `New file, ${formatDateTime(document.created_at)}`;
}

/**
 * The right pane of an application: a checklist, not a wizard. Every section stays visible
 * and the one primary button follows what the sections say: "Ask for documents" while a
 * required document is rejected or missing, else "Approve" once both are accepted and the
 * prices are set. Everything comes from the server; after each call the page re-renders
 * with what it stored. Verdicts need documents.review, decisions applications.review.
 */
export function ReviewPanel({
  application,
  documents,
  history,
  canDecide,
  trainerHref,
}: {
  application: ReviewPanelApplication;
  /** Null without documents.review. */
  documents: ReviewDocument[] | null;
  history: ReviewHistory | null;
  canDecide: boolean;
  /** The trainer page, when the session may open it (shown once approved). */
  trainerHref: string | null;
}) {
  const review = deriveReview({
    status: application.status,
    submittedAt: application.submitted_at,
    updatedAt: application.updated_at,
    documents,
    history,
  });
  const name = application.full_name.trim() || "this trainer";
  const modes = application.modes;
  const [priceInputs, setPriceInputs] = useState({
    home: application.expected_home_rate_inr?.toString() ?? "",
    online: application.expected_online_rate_inr?.toString() ?? "",
  });
  // A check the reviewer flipped by hand; otherwise ID and certificate follow their documents.
  const [checkOverrides, setCheckOverrides] = useState<Partial<Record<VerifiedCheck, boolean>>>({});
  const acceptedKinds = new Set<string>(
    review.required.filter((row) => row.state === "accepted").map((row) => row.kind),
  );
  const decidedAt = review.decided ? (review.steps.at(-1)?.at ?? null) : null;
  const checks = VERIFIED_CHECKS.filter((check) => checkOverrides[check] ?? acceptedKinds.has(check));
  const canReviewDocuments = review.documentsVisible && !review.decided && application.status !== "draft";
  const editable = canDecide && !review.decided && application.status !== "draft";

  return (
    <aside
      aria-labelledby="review-panel-title"
      className="flex flex-col rounded-xl border bg-card shadow-tile lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-4 px-5 pt-4 pb-4">
        <h2 id="review-panel-title" className="text-lg font-semibold">
          Review
        </h2>
        <ProgressStrip steps={review.steps} />
        {review.resubmitted ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-warning px-3 py-2 text-sm text-warning"
          >
            <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            Documents resubmitted. The new files are under Needs your attention.
          </p>
        ) : null}
      </div>

      {application.status === "draft" ? (
        <p className="border-t px-5 py-4 text-sm text-muted-foreground">
          The trainer has not submitted this application yet.
        </p>
      ) : null}

      {review.documentsVisible && review.attention.length > 0 && !review.decided ? (
        <PanelSection id="review-attention" title="Needs your attention">
          <ul className="-mx-4 flex flex-col divide-y">
            {review.attention.map(({ document, resubmitted }) => (
              <DocumentReviewRow
                key={document.id}
                title={DOCUMENT_KIND_LABELS[document.kind]}
                document={document}
                chip={
                  resubmitted
                    ? { label: "Resubmitted", tone: requiredDocumentTone("resubmitted") }
                    : { label: "Waiting", tone: requiredDocumentTone("waiting") }
                }
                detail={resubmitted ? newFileLine(document) : undefined}
                canReview={canReviewDocuments}
              />
            ))}
          </ul>
        </PanelSection>
      ) : null}

      <PanelSection
        id="review-documents"
        title="Documents"
        aside={
          review.documentsVisible ? (
            <AcceptedRing accepted={review.acceptedCount} total={REQUIRED_DOCUMENT_KINDS.length} />
          ) : null
        }
      >
        {review.documentsVisible ? (
          <>
            <ul className="-mx-4 flex flex-col divide-y">
              {review.required.map((row) => (
                <DocumentReviewRow
                  key={row.kind}
                  title={DOCUMENT_KIND_LABELS[row.kind]}
                  document={row.document}
                  chip={{
                    label: REQUIRED_DOCUMENT_STATE_LABELS[row.state],
                    tone: requiredDocumentTone(row.state),
                  }}
                  detail={row.state === "resubmitted" && row.document ? newFileLine(row.document) : undefined}
                  canReview={canReviewDocuments}
                />
              ))}
            </ul>
            {review.extras.length > 0 ? (
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-medium text-muted-foreground">Optional and earlier files</h4>
                <ul className="-mx-4 flex flex-col divide-y">
                  {review.extras.map((document) => (
                    <DocumentReviewRow
                      key={document.id}
                      title={documentTitle(document, review)}
                      document={document}
                      chip={{
                        label: DOCUMENT_STATUS_LABELS[document.status],
                        tone: documentStatusTone(document.status),
                      }}
                      canReview={canReviewDocuments}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Documents need the Review documents permission.
          </p>
        )}
      </PanelSection>

      {review.decided ? (
        <PanelSection id="review-decision" title="Decision">
          <p className="text-sm">
            <span className="font-medium">{APPLICATION_STATUS_LABELS[application.status]}</span>
            {decidedAt ? ` on ${formatDateTime(decidedAt)}` : ""}.
          </p>
          {application.reviewer_note ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note to the trainer: </span>
              {application.reviewer_note}
            </p>
          ) : null}
          {application.status === "approved" ? (
            <p className="text-xs text-muted-foreground">
              Prices, listing and later document requests live on the trainer page.
              {trainerHref ? (
                <>
                  {" "}
                  <Link href={trainerHref} className="focus-ring rounded-sm text-foreground underline">
                    Open the trainer page
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </PanelSection>
      ) : null}

      {editable ? (
        <ReviewDecisionSections
          trainerId={application.trainer_id}
          name={name}
          modes={modes}
          expected={{
            home: application.expected_home_rate_inr,
            online: application.expected_online_rate_inr,
          }}
          review={review}
          priceInputs={priceInputs}
          onPriceChange={(mode, value) => setPriceInputs((previous) => ({ ...previous, [mode]: value }))}
          checks={checks}
          onCheckChange={(check, on) => setCheckOverrides((previous) => ({ ...previous, [check]: on }))}
        />
      ) : null}

      {!canDecide && !review.decided && application.status !== "draft" ? (
        <p className="border-t px-5 py-4 text-sm text-muted-foreground">
          Decisions need the Approve or reject applications permission.
        </p>
      ) : null}
    </aside>
  );
}

function ReviewDecisionSections({
  trainerId,
  name,
  modes,
  expected,
  review,
  priceInputs,
  onPriceChange,
  checks,
  onCheckChange,
}: {
  trainerId: string;
  name: string;
  modes: TrainerApplicationRow["modes"];
  expected: { home: number | null; online: number | null };
  review: ReviewState;
  priceInputs: { home: string; online: string };
  onPriceChange: (mode: "home" | "online", value: string) => void;
  checks: VerifiedCheck[];
  onCheckChange: (check: VerifiedCheck, on: boolean) => void;
}) {
  const plan = decisionPlan(review, modes, priceInputs);

  return (
    <>
      <PanelSection id="review-checks" title="Checks">
        <ul className="flex flex-col gap-2">
          {VERIFIED_CHECKS.map((check) => (
            <li key={check} className="flex items-center justify-between gap-3">
              <Label htmlFor={`review-check-${check}`} className="font-normal">
                {VERIFIED_CHECK_LABELS[check]}
              </Label>
              <Switch
                id={`review-check-${check}`}
                checked={checks.includes(check)}
                onCheckedChange={(on) => onCheckChange(check, on)}
              />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Shown on the public profile once approved. ID and certificate tick themselves when their
          documents are accepted.
        </p>
      </PanelSection>

      <PanelSection id="review-prices" title="Prices">
        {modes.length === 0 ? (
          <p className="text-sm text-muted-foreground">The trainer offers no modes yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {modes.map((mode) => (
              <div key={mode} className="flex flex-wrap items-center gap-3">
                <Label htmlFor={`review-price-${mode}`} className="w-28">
                  {MODE_LABELS[mode]} price
                </Label>
                <Input
                  id={`review-price-${mode}`}
                  type="number"
                  inputMode="numeric"
                  min={PRICE_MIN_INR}
                  max={PRICE_MAX_INR}
                  step={1}
                  className="w-32"
                  value={priceInputs[mode]}
                  onChange={(event) => onPriceChange(mode, event.target.value)}
                  aria-describedby={`review-price-${mode}-bid`}
                />
                <span id={`review-price-${mode}-bid`} className="text-xs text-muted-foreground">
                  {expected[mode] === null ? "No bid" : `asked ${formatInr(expected[mode])}`}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">INR per session, what clients pay.</p>
          </div>
        )}
      </PanelSection>

      <section
        aria-labelledby="review-decision"
        className="sticky bottom-0 flex flex-col gap-3 border-t bg-card px-5 py-4"
      >
        <h3 id="review-decision" className="sr-only">
          Decision
        </h3>
        {review.waitingNow ? (
          <p className="flex items-center gap-2 text-sm text-warning">
            <Clock size={16} aria-hidden="true" />
            Waiting for the trainer
            {review.waitingSince ? ` since ${formatDateTime(review.waitingSince)}` : ""}
          </p>
        ) : null}
        {plan.primary === "ask" ? (
          <p className="text-xs text-muted-foreground">
            {plan.kinds.map((kind) => DOCUMENT_KIND_LABELS[kind]).join(" and ")}{" "}
            {plan.kinds.length > 1 ? "need" : "needs"} a new upload before you can approve.
          </p>
        ) : plan.blocker ? (
          <p id="review-approve-hint" className="text-xs text-muted-foreground">
            {plan.blocker}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RejectApplicationDialog trainerId={trainerId} trainerName={name} />
          {plan.primary === "ask" ? (
            <RequestDocumentsDialog
              trainerId={trainerId}
              trainerName={name}
              defaultKinds={plan.kinds}
              trigger={
                <Button>
                  <FileText size={16} aria-hidden="true" />
                  Ask for documents
                </Button>
              }
            />
          ) : (
            <ApproveDialog
              trainerId={trainerId}
              trainerName={name}
              modes={modes}
              prices={plan.prices}
              checks={checks}
              disabled={plan.blocker !== null}
              describedBy={plan.blocker ? "review-approve-hint" : undefined}
            />
          )}
        </div>
      </section>
    </>
  );
}
