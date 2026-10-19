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
import { cancelBookingAction } from "@/features/bookings/actions";
import { CANCEL_REASON_MAX, cancelBookingSchema } from "@/features/bookings/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Cancels the booking on behalf of BRUTAL through admin_cancel_booking, with a required
 * reason. Both parties are notified by the server; a paid booking moves to refund pending.
 * Gated by bookings.cancel and shown only while the status allows it.
 */
export function CancelBookingDialog({ bookingId, paid }: { bookingId: string; paid: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { bookingId, reason: String(new FormData(event.currentTarget).get("reason") ?? "") };
    const parsed = cancelBookingSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reason and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Booking cancelled. Both parties were notified.");
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
        <Button variant="destructive">
          <X size={16} aria-hidden="true" />
          Cancel on behalf
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking</DialogTitle>
          <DialogDescription>
            The booking is cancelled by BRUTAL and both the client and the trainer are notified
            with your reason.
            {paid ? " The payment moves to refund pending." : ""} This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-booking-reason">Reason (both parties see it)</Label>
            <Textarea
              id="cancel-booking-reason"
              name="reason"
              maxLength={CANCEL_REASON_MAX}
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
              {pending ? "Cancelling..." : "Cancel booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
