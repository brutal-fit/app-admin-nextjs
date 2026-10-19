"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check } from "@/components/icons";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resolveDisputeAction } from "@/features/bookings/actions";
import {
  DISPUTE_NOTE_MAX,
  DISPUTE_OUTCOMES,
  DISPUTE_OUTCOME_LABELS,
  resolveDisputeSchema,
  type DisputeOutcomeValue,
} from "@/features/bookings/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Settles a disagreement about a completed or no-show session through admin_resolve_dispute:
 * the outcome becomes the booking status, the note is recorded, and both parties are
 * notified. A booking is resolved once. Payment is left alone. Gated by bookings.cancel.
 */
export function ResolveDisputeDialog({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<DisputeOutcomeValue | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      bookingId,
      outcome,
      note: String(new FormData(event.currentTarget).get("note") ?? ""),
    };
    const parsed = resolveDisputeSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the outcome and note and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await resolveDisputeAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Dispute resolved. Both parties were notified.");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Check size={16} aria-hidden="true" />
          Resolve dispute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve the dispute</DialogTitle>
          <DialogDescription>
            The outcome becomes the booking status and both parties are notified. A booking can
            be resolved once; payment is not changed here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dispute-outcome">Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(value) => setOutcome(value as DisputeOutcomeValue)}
              disabled={pending}
            >
              <SelectTrigger id="dispute-outcome" className="w-full">
                <SelectValue placeholder="Choose an outcome" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_OUTCOMES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DISPUTE_OUTCOME_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dispute-note">How it was resolved</Label>
            <Textarea
              id="dispute-note"
              name="note"
              maxLength={DISPUTE_NOTE_MAX}
              required
              disabled={pending}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Resolve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
