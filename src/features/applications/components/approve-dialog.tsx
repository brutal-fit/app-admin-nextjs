"use client";

import { useState, useTransition } from "react";
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
import { reviewApplicationAction } from "@/features/applications/actions";
import { formatInr } from "@/features/applications/format";
import {
  MODE_LABELS,
  VERIFIED_CHECK_LABELS,
  type VerifiedCheck,
} from "@/features/applications/schemas";
import { showToast } from "@/stores/toast-store";
import type { SessionMode } from "@/types/database";

/**
 * The confirm step before approving: names the trainer and the prices they go live at, then
 * calls review_application with approved (applications.review). The server checks the
 * documents and prices again and its message shows here when it refuses.
 */
export function ApproveDialog({
  trainerId,
  trainerName,
  modes,
  prices,
  checks,
  disabled,
  describedBy,
}: {
  trainerId: string;
  trainerName: string;
  modes: readonly SessionMode[];
  prices: { home: number | null; online: number | null };
  checks: readonly VerifiedCheck[];
  disabled: boolean;
  /** The hint that says why Approve is disabled. */
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await reviewApplicationAction({
        trainerId,
        status: "approved",
        note: "",
        homeRateInr: modes.includes("home") ? prices.home : null,
        onlineRateInr: modes.includes("online") ? prices.online : null,
        verifiedChecks: [...checks],
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      showToast("success", `Approved ${trainerName}.`);
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
        <Button disabled={disabled} aria-describedby={describedBy}>
          <Check size={16} aria-hidden="true" />
          Approve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {trainerName}?</DialogTitle>
          <DialogDescription>They go live at these prices.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
          {modes.map((mode) => (
            <div key={mode} className="contents">
              <dt className="text-muted-foreground">{MODE_LABELS[mode]}</dt>
              <dd>{formatInr(mode === "home" ? prices.home : prices.online)} a session</dd>
            </div>
          ))}
          <dt className="text-muted-foreground">Verified checks</dt>
          <dd>
            {checks.length === 0 ? "None" : checks.map((check) => VERIFIED_CHECK_LABELS[check]).join(", ")}
          </dd>
        </dl>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? "Approving..." : "Approve and publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
