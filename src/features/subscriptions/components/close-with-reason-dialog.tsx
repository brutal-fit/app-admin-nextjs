"use client";

import { useState, useTransition, type FormEvent } from "react";
import { X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { closeOutcomeText, type CloseOutcome } from "@/features/subscriptions/format";
import { CLOSE_REASON_MAX, CLOSE_REASON_MIN, closeReasonSchema } from "@/features/subscriptions/schemas";
import { showToast } from "@/stores/toast-store";
import type { ActionResult } from "@/types/action-result";

type Step = { kind: "reason" } | { kind: "done"; text: string };

/**
 * The shared shape of cancelling a subscription and ending a coaching: a required reason (10
 * to 200 characters) that the client sees, then what the server queued for refund, read back
 * after the call. Used by cancel-subscription-dialog and end-coaching-dialog.
 */
export function CloseWithReasonDialog({
  idPrefix,
  triggerLabel,
  title,
  description,
  submitLabel,
  pendingLabel,
  noun,
  successToast,
  onClose,
}: {
  idPrefix: string;
  triggerLabel: string;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  noun: "period" | "month";
  successToast: string;
  onClose: (reason: string) => Promise<ActionResult<CloseOutcome>>;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "reason" });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasonId = `${idPrefix}-reason`;

  function reset(value: boolean) {
    setOpen(value);
    if (!value) {
      setStep({ kind: "reason" });
      setDraft("");
      setError(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = closeReasonSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reason and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onClose(parsed.data);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      const text = closeOutcomeText(result.data, noun);
      setStep({ kind: "done", text });
      showToast("success", successToast);
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          <X size={16} aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {step.kind === "reason" ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor={reasonId}>Reason (the client sees it)</Label>
              <Textarea
                id={reasonId}
                name="reason"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={CLOSE_REASON_MAX}
                aria-describedby={`${reasonId}-hint`}
                required
                disabled={pending}
              />
              <p id={`${reasonId}-hint`} className="text-xs text-muted-foreground">
                {CLOSE_REASON_MIN} to {CLOSE_REASON_MAX} characters.
              </p>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? pendingLabel : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p role="status" className="text-sm">
              {step.text}
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => reset(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
