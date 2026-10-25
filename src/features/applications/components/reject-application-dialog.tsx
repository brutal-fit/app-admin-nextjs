"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import { reviewApplicationAction } from "@/features/applications/actions";
import { reviewApplicationSchema } from "@/features/applications/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Rejects the whole application with a reason the trainer sees (review_application rejected,
 * applications.review). The secondary action beside the one primary button.
 */
export function RejectApplicationDialog({
  trainerId,
  trainerName,
}: {
  trainerId: string;
  trainerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      trainerId,
      status: "rejected",
      note: String(new FormData(event.currentTarget).get("note") ?? ""),
      homeRateInr: null,
      onlineRateInr: null,
      verifiedChecks: [],
    };
    const parsed = reviewApplicationSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reason and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reviewApplicationAction(input);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      showToast("success", `Rejected ${trainerName}'s application.`);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive">
          Reject application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {trainerName}&apos;s application?</DialogTitle>
          <DialogDescription>
            The trainer sees your reason. To ask for a new document instead, reject that document.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-application-note">Reason for the trainer</Label>
            <Textarea
              id="reject-application-note"
              name="note"
              maxLength={1000}
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
              {pending ? "Rejecting..." : "Reject application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
