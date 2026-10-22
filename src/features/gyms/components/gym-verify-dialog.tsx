"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Flag, X } from "@/components/icons";
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
import { verifyGymAction } from "@/features/gyms/actions";
import {
  GYM_DECISION_LABELS,
  GYM_NOTE_MAX,
  decisionNeedsNote,
  verifyGymSchema,
  type GymDecision,
} from "@/features/gyms/schemas";
import { showToast } from "@/stores/toast-store";

const DESCRIPTIONS: Record<GymDecision, (name: string) => string> = {
  verified: (name) =>
    `${name} becomes verified and its managers are told. It goes live only when you list it.`,
  rejected: (name) =>
    `${name} goes back to draft with your note, so its managers can fix it and send it again.`,
  suspended: (name) =>
    `${name} leaves the listing at once and its managers get your reason. Existing bookings stay as they are.`,
};

const ICONS = { verified: Check, rejected: X, suspended: Flag } as const;

/**
 * One gym decision through admin_verify_gym: verify, send back with a note, or suspend with a
 * reason. The page offers only the decisions the gym's status allows. Gated by gyms.manage.
 */
export function GymVerifyDialog({
  gymId,
  gymName,
  decision,
}: {
  gymId: string;
  gymName: string;
  decision: GymDecision;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsNote = decisionNeedsNote(decision);
  const DecisionIcon = ICONS[decision];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { gymId, decision, note: String(new FormData(event.currentTarget).get("note") ?? "") };
    const parsed = verifyGymSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the note.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyGymAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast(
        "success",
        decision === "verified"
          ? `${gymName} is verified.`
          : decision === "rejected"
            ? `${gymName} was sent back.`
            : `${gymName} is suspended.`,
      );
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
        <Button variant={decision === "verified" ? "default" : decision === "suspended" ? "destructive" : "outline"}>
          <DecisionIcon size={16} aria-hidden="true" />
          {GYM_DECISION_LABELS[decision]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {GYM_DECISION_LABELS[decision]} {gymName}
          </DialogTitle>
          <DialogDescription>{DESCRIPTIONS[decision](gymName)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`gym-decision-note-${decision}`}>
              {needsNote ? "Note to the gym" : "Note to the gym (optional)"}
            </Label>
            <Textarea
              id={`gym-decision-note-${decision}`}
              name="note"
              maxLength={GYM_NOTE_MAX}
              required={needsNote}
              disabled={pending}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant={decision === "suspended" ? "destructive" : "default"} disabled={pending}>
              {pending ? "Saving..." : GYM_DECISION_LABELS[decision]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
