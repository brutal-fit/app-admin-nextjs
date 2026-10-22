"use client";

import { useState, useTransition, type FormEvent } from "react";
import { RotateCcw } from "@/components/icons";
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
import { formatInr } from "@/features/applications/format";
import { refundPaymentAction } from "@/features/payments/actions";
import {
  PAYMENT_STATE_LABELS,
  REFUND_REASON_MAX,
  REFUND_REASON_MIN,
  refundBlockedReason,
  refundReasonSchema,
} from "@/features/payments/schemas";
import type { RefundOutcome } from "@/lib/db/payments";
import { showToast } from "@/stores/toast-store";
import type { PaymentState } from "@/types/database";

type Step = { kind: "reason" } | { kind: "confirm"; reason: string } | { kind: "done"; outcome: RefundOutcome };

function outcomeText(outcome: RefundOutcome): string {
  if (outcome.outcome === "requested") {
    return `Razorpay accepted the refund. The payment is now ${PAYMENT_STATE_LABELS[outcome.state].toLowerCase()}; it reads refunded once Razorpay confirms.`;
  }
  const state = outcome.state ? PAYMENT_STATE_LABELS[outcome.state].toLowerCase() : "unchanged";
  return `${outcome.message} The payment is ${state}.`;
}

/**
 * A full refund by hand through the `refund` Edge Function: a required reason (10 to 200
 * characters), then a confirm step naming the amount, then the state the server returned.
 * The trigger is disabled, with the reason beside it, unless the payment is paid or its
 * refund failed. Gated by payments.manage.
 */
export function RefundPaymentDialog({
  paymentId,
  state,
  amountInr,
}: {
  paymentId: string;
  state: PaymentState;
  amountInr: number;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "reason" });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = refundBlockedReason(state);
  const amount = formatInr(amountInr);

  function reset(value: boolean) {
    setOpen(value);
    if (!value) {
      setStep({ kind: "reason" });
      setDraft("");
      setError(null);
    }
  }

  function onReason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = refundReasonSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reason and try again.");
      return;
    }
    setError(null);
    setStep({ kind: "confirm", reason: parsed.data });
  }

  function onConfirm(reason: string) {
    startTransition(async () => {
      const result = await refundPaymentAction({ paymentId, reason });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      setError(null);
      setStep({ kind: "done", outcome: result.data });
      showToast(result.data.outcome === "requested" ? "success" : "error", outcomeText(result.data));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Dialog open={open} onOpenChange={reset}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={blocked !== null} className="w-fit">
            <RotateCcw size={16} aria-hidden="true" />
            Refund {amount}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund this payment</DialogTitle>
            <DialogDescription>
              Razorpay returns the full {amount} to the client&apos;s payment method. Banks take 5 to 7
              working days. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {step.kind === "reason" ? (
            <form onSubmit={onReason} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="refund-reason">Reason</Label>
                <Textarea
                  id="refund-reason"
                  name="reason"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={REFUND_REASON_MAX}
                  aria-describedby="refund-reason-hint"
                  required
                />
                <p id="refund-reason-hint" className="text-xs text-muted-foreground">
                  {REFUND_REASON_MIN} to {REFUND_REASON_MAX} characters, such as the support case or why the
                  automatic refund did not happen.
                </p>
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="submit">Continue</Button>
              </DialogFooter>
            </form>
          ) : step.kind === "confirm" ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm">
                Refund <span className="font-semibold">{amount}</span> in full?
              </p>
              <p className="text-sm text-muted-foreground">Reason: {step.reason}</p>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setStep({ kind: "reason" })}>
                  Back
                </Button>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => onConfirm(step.reason)}>
                  {pending ? "Refunding..." : `Refund ${amount}`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p role="status" className="text-sm">
                {outcomeText(step.outcome)}
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
      {blocked ? <p className="text-sm text-muted-foreground">{blocked}</p> : null}
    </div>
  );
}
