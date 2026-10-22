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
import { declineRequestAction } from "@/features/my-gym/actions";
import { DECLINE_REASON_MAX, declineRequestSchema } from "@/features/my-gym/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Declines a booking request through gym_decline_request: the booking is cancelled and the
 * client is told the gym's reason. Gated by gym.self and the gym's manager row.
 */
export function DeclineRequestDialog({ bookingId, clientName }: { bookingId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { bookingId, reason: String(new FormData(event.currentTarget).get("reason") ?? "") };
    const parsed = declineRequestSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Give a reason.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await declineRequestAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `Declined. ${clientName} is told why.`);
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
          <X size={16} aria-hidden="true" />
          Decline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this request</DialogTitle>
          <DialogDescription>
            The booking is cancelled and {clientName} sees your reason. They can book another time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`decline-reason-${bookingId}`}>Reason for the client</Label>
            <Textarea
              id={`decline-reason-${bookingId}`}
              name="reason"
              maxLength={DECLINE_REASON_MAX}
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
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Declining..." : "Decline request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
