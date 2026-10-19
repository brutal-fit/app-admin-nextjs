"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reviewApplicationAction } from "@/features/applications/actions";
import { formatInr } from "@/features/applications/format";
import {
  APPLICATION_STATUS_LABELS,
  MODE_LABELS,
  PRICE_MAX_INR,
  PRICE_MIN_INR,
  REVIEW_DECISIONS,
  VERIFIED_CHECKS,
  VERIFIED_CHECK_LABELS,
  missingPriceMessage,
  reviewApplicationSchema,
  type ReviewDecision,
  type VerifiedCheck,
} from "@/features/applications/schemas";
import { showToast } from "@/stores/toast-store";
import type { ApplicationStatus, SessionMode } from "@/types/database";

function isReviewDecision(status: ApplicationStatus): status is ReviewDecision {
  return (REVIEW_DECISIONS as readonly string[]).includes(status);
}

/** Empty means "no price"; anything else must parse as a whole number (Zod reports it). */
function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/**
 * The application decision: status, note, platform prices for the offered modes and the
 * verified checks, sent to review_application. Gated by applications.review. Nothing is
 * changed locally: after a save the page re-renders with what the server stored.
 */
export function DecisionForm({
  trainerId,
  currentStatus,
  modes,
  expectedHomeRateInr,
  expectedOnlineRateInr,
}: {
  trainerId: string;
  currentStatus: ApplicationStatus;
  modes: SessionMode[];
  expectedHomeRateInr: number | null;
  expectedOnlineRateInr: number | null;
}) {
  const [status, setStatus] = useState<ReviewDecision | "">(
    isReviewDecision(currentStatus) ? currentStatus : "",
  );
  const [checks, setChecks] = useState<ReadonlySet<VerifiedCheck>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const offersHome = modes.includes("home");
  const offersOnline = modes.includes("online");

  function toggleCheck(check: VerifiedCheck, on: boolean) {
    setChecks((previous) => {
      const next = new Set(previous);
      if (on) next.add(check);
      else next.delete(check);
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      trainerId,
      status,
      note: String(form.get("note") ?? ""),
      homeRateInr: offersHome ? parsePrice(String(form.get("homeRateInr") ?? "")) : null,
      onlineRateInr: offersOnline ? parsePrice(String(form.get("onlineRateInr") ?? "")) : null,
      verifiedChecks: VERIFIED_CHECKS.filter((check) => checks.has(check)),
    };
    const parsed = reviewApplicationSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the decision and try again.");
      return;
    }
    // The same rule the server action applies with the modes it reads from the database.
    const missing = missingPriceMessage(status, modes, {
      home: parsed.data.homeRateInr,
      online: parsed.data.onlineRateInr,
    });
    if (missing) {
      setError(missing);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reviewApplicationAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Decision saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="decision-status">Decision</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as ReviewDecision)}
          disabled={pending}
        >
          <SelectTrigger id="decision-status" className="w-full sm:w-72">
            <SelectValue placeholder="Choose a decision" />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_DECISIONS.map((decision) => (
              <SelectItem key={decision} value={decision}>
                {APPLICATION_STATUS_LABELS[decision]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="decision-note">Note for the trainer (optional)</Label>
        <Textarea
          id="decision-note"
          name="note"
          maxLength={1000}
          disabled={pending}
          aria-describedby="decision-note-hint"
        />
        <p id="decision-note-hint" className="text-xs text-muted-foreground">
          Shown to the trainer with the decision; say what is missing when asking for information.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Platform prices (INR per session)</legend>
        <p className="text-xs text-muted-foreground">
          What clients pay. Required for every offered mode when approving; ignored otherwise.
        </p>
        <div className="flex flex-wrap gap-4">
          {offersHome ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="decision-home-rate">{MODE_LABELS.home} price</Label>
              <Input
                id="decision-home-rate"
                name="homeRateInr"
                type="number"
                inputMode="numeric"
                min={PRICE_MIN_INR}
                max={PRICE_MAX_INR}
                step={1}
                className="w-40"
                aria-describedby="decision-home-expected"
              />
              <p id="decision-home-expected" className="text-xs text-muted-foreground">
                Expected by the trainer: {formatInr(expectedHomeRateInr)}
              </p>
            </div>
          ) : null}
          {offersOnline ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="decision-online-rate">{MODE_LABELS.online} price</Label>
              <Input
                id="decision-online-rate"
                name="onlineRateInr"
                type="number"
                inputMode="numeric"
                min={PRICE_MIN_INR}
                max={PRICE_MAX_INR}
                step={1}
                className="w-40"
                aria-describedby="decision-online-expected"
              />
              <p id="decision-online-expected" className="text-xs text-muted-foreground">
                Expected by the trainer: {formatInr(expectedOnlineRateInr)}
              </p>
            </div>
          ) : null}
          {!offersHome && !offersOnline ? (
            <p className="text-sm text-muted-foreground">The trainer offers no modes yet.</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Verified checks</legend>
        <p className="text-xs text-muted-foreground">
          Shown on the public profile when approving; replaces the checks it had.
        </p>
        <div className="flex flex-col gap-2">
          {VERIFIED_CHECKS.map((check) => (
            <div key={check} className="flex items-center gap-3">
              <Checkbox
                id={`decision-check-${check}`}
                checked={checks.has(check)}
                onCheckedChange={(value) => toggleCheck(check, value === true)}
              />
              <Label htmlFor={`decision-check-${check}`}>{VERIFIED_CHECK_LABELS[check]}</Label>
            </div>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save decision"}
        </Button>
      </div>
    </form>
  );
}
