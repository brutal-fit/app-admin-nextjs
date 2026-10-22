"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allotTrainerAction } from "@/features/my-gym/actions";
import type { TrainerOption } from "@/features/my-gym/format";
import { allotTrainerSchema } from "@/features/my-gym/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Picks a trainer from the gym's own active trainers (the options come from allotCandidates,
 * never a free entry) and allots them to a request through gym_allot_trainer, which confirms
 * it; or, for a confirmed session that has not started, reassigns it through
 * gym_reassign_trainer. The server refuses anyone outside the gym's active staff. Gated by
 * gym.self and the gym's manager row.
 */
export function AllotTrainerForm({
  bookingId,
  kind,
  options,
}: {
  bookingId: string;
  kind: "allot" | "reassign";
  options: readonly TrainerOption[];
}) {
  const [trainer, setTrainer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = `${kind}-trainer-${bookingId}`;

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {kind === "allot"
          ? "No active trainer on your staff yet. Invite one under Staff; they join when they sign in."
          : "No other active trainer on your staff to hand this session to."}
      </p>
    );
  }

  function submit() {
    const input = { bookingId, trainerUserId: trainer, kind };
    const parsed = allotTrainerSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Pick a trainer from your staff.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await allotTrainerAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", kind === "allot" ? "Trainer allotted. The client and trainer are told." : "Session reassigned.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{kind === "allot" ? "Trainer" : "New trainer"}</Label>
          <Select value={trainer} onValueChange={setTrainer} disabled={pending}>
            <SelectTrigger id={id} className="w-56">
              <SelectValue placeholder="Pick from your staff" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.userId} value={option.userId}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={pending || trainer === ""} variant={kind === "allot" ? "default" : "outline"}>
          <UserCheck size={16} aria-hidden="true" />
          {pending ? "Saving..." : kind === "allot" ? "Allot and confirm" : "Reassign"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
