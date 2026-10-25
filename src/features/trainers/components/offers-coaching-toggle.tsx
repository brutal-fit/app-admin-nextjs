"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setOffersCoachingAction } from "@/features/trainers/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Turns trainer_profiles.offers_coaching on or off through admin_update_trainer_profile. The
 * switch shows the stored value only: it moves when the page re-reads the profile after the
 * server saved it. Gated by trainers.edit.
 */
export function OffersCoachingToggle({
  trainerId,
  trainerName,
  offersCoaching,
}: {
  trainerId: string;
  trainerName: string;
  offersCoaching: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(next: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setOffersCoachingAction({ trainerId, offersCoaching: next });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast(
        "success",
        next ? `${trainerName} can now be picked as a coach.` : `${trainerName} is no longer offered as a coach.`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Switch
          id="trainer-offers-coaching"
          checked={offersCoaching}
          disabled={pending}
          onCheckedChange={onChange}
          aria-describedby="trainer-offers-coaching-help"
        />
        <Label htmlFor="trainer-offers-coaching">Offers coaching</Label>
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          {pending ? "Saving..." : offersCoaching ? "On" : "Off"}
        </span>
      </div>
      <p id="trainer-offers-coaching-help" className="text-xs text-muted-foreground">
        Clients can pick this trainer as the coach of a library programme while the trainer is
        listed, coaches online and has an active online service.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
