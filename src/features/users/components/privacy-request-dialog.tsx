"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, X } from "@/components/icons";
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
import { processPrivacyRequestAction } from "@/features/users/actions";
import { PRIVACY_NOTE_MAX, processPrivacyRequestSchema } from "@/features/users/schemas";
import { showToast } from "@/stores/toast-store";
import type { PrivacyOutcome } from "@/types/database";

/**
 * Marks one privacy request completed or rejected, with an optional note the user sees in
 * their notification. Gated by privacy.process; the request's new status comes from the
 * server when the page re-reads it.
 */
export function PrivacyRequestDialog({
  requestId,
  kindLabel,
  outcome,
}: {
  requestId: string;
  /** "Data export" or "Account deletion". */
  kindLabel: string;
  outcome: PrivacyOutcome;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const completing = outcome === "completed";
  const noteId = `privacy-note-${outcome}-${requestId}`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = processPrivacyRequestSchema.safeParse({
      requestId,
      outcome,
      note: String(new FormData(event.currentTarget).get("note") ?? ""),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the note and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await processPrivacyRequestAction(parsed.data);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `${kindLabel} request marked ${outcome}.`);
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
        <Button size="sm" variant={completing ? "outline" : "destructive"}>
          {completing ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          {completing ? "Mark completed" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{completing ? `Complete ${kindLabel.toLowerCase()}` : `Reject ${kindLabel.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            {completing
              ? "Confirm the work is done outside the panel. The user is notified in the app."
              : "The user is notified in the app that the request was declined."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={noteId}>Note for the user (optional)</Label>
            <Textarea id={noteId} name="note" maxLength={PRIVACY_NOTE_MAX} disabled={pending} />
            <p className="text-xs text-muted-foreground">
              Without a note the user gets a standard message. The note is kept in the audit log.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant={completing ? "default" : "destructive"} disabled={pending}>
              {pending ? "Saving..." : completing ? "Mark completed" : "Reject request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
