"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Check, ExternalLink, X } from "@/components/icons";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { reviewDocumentAction } from "@/features/applications/actions";
import { formatBytes } from "@/features/applications/format";
import { useOpenDocument } from "@/features/applications/hooks/use-open-document";
import type { ReviewDocument } from "@/features/applications/review-state";
import { showToast } from "@/stores/toast-store";

/**
 * One document in the review panel: what it is, its state chip, a preview link and the inline
 * verdict (Accept at once, Reject with an optional note in a popover). Verdicts go to
 * review_document (documents.review); the row shows what the server returns on refresh.
 */
export function DocumentReviewRow({
  title,
  document,
  chip,
  detail,
  canReview,
}: {
  title: string;
  /** Null for a required kind the trainer has not uploaded. */
  document: ReviewDocument | null;
  chip: { label: string; tone: string };
  /** A second line, e.g. "New file, 25 Oct 2026, 10:00 am". */
  detail?: string;
  /** Verdict buttons; false on a decided application or without documents.review. */
  canReview: boolean;
}) {
  const { opening, open } = useOpenDocument();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noteId = useId();

  function verdict(status: "accepted" | "rejected", note: string) {
    if (!document) return;
    setError(null);
    startTransition(async () => {
      const result = await reviewDocumentAction({ documentId: document.id, status, note });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setRejectOpen(false);
      showToast(
        "success",
        status === "accepted" ? `Accepted ${document.file_name}.` : `Rejected ${document.file_name}.`,
      );
    });
  }

  function onReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verdict("rejected", String(new FormData(event.currentTarget).get("note") ?? ""));
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          {document ? (
            <span className="break-all text-xs text-muted-foreground">
              {document.file_name}, {formatBytes(document.size_bytes)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not uploaded yet</span>
          )}
          {detail ? <span className="text-xs text-warning">{detail}</span> : null}
        </div>
        <StatusPulse value={chip.label} className={chip.tone}>
          <Badge variant="outline" className={chip.tone}>
            {chip.label}
          </Badge>
        </StatusPulse>
      </div>
      {document?.note && document.status === "rejected" ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Reason: </span>
          {document.note}
        </p>
      ) : null}
      {document ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={opening}
            onClick={() => void open(document.id)}
            aria-label={`Preview ${document.file_name} in a new tab`}
          >
            <ExternalLink size={16} aria-hidden="true" />
            {opening ? "Opening..." : "Preview"}
          </Button>
          {canReview ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || document.status === "accepted"}
                onClick={() => verdict("accepted", "")}
                aria-label={`Accept ${document.file_name}`}
              >
                <Check size={16} aria-hidden="true" />
                Accept
              </Button>
              <Popover
                open={rejectOpen}
                onOpenChange={(next) => {
                  setRejectOpen(next);
                  if (!next) setError(null);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={pending || document.status === "rejected"}
                    aria-label={`Reject ${document.file_name}`}
                  >
                    <X size={16} aria-hidden="true" />
                    Reject
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <form onSubmit={onReject} className="flex flex-col gap-3" noValidate>
                    <Label htmlFor={noteId}>What should the trainer fix? (optional)</Label>
                    <Textarea id={noteId} name="note" maxLength={500} disabled={pending} autoFocus />
                    <p className="text-xs text-muted-foreground">
                      The trainer is told to upload a new one and the application goes back to them.
                    </p>
                    {error ? (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    ) : null}
                    <Button type="submit" size="sm" variant="destructive" disabled={pending}>
                      {pending ? "Saving..." : "Reject document"}
                    </Button>
                  </form>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
        </div>
      ) : null}
      {error && !rejectOpen ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
