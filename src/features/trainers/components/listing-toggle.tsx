"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "@/components/icons";
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
import { setTrainerListedAction } from "@/features/trainers/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Lists or unlists the trainer (trainer_profiles.published) through
 * admin_update_trainer_profile, behind a confirmation. Listing needs an approved application;
 * the server refuses otherwise and its words are shown. Gated by trainers.edit.
 */
export function ListingToggle({
  trainerId,
  trainerName,
  listed,
  blockedReason,
}: {
  trainerId: string;
  trainerName: string;
  listed: boolean;
  /** Why listing is not possible now (shown instead of the button), or null. */
  blockedReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = !listed;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await setTrainerListedAction({ trainerId, published: next });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", next ? `${trainerName} is listed.` : `${trainerName} is no longer listed.`);
      setOpen(false);
    });
  }

  if (next && blockedReason) {
    return <p className="text-sm text-muted-foreground">{blockedReason}</p>;
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
        <Button variant={listed ? "outline" : "default"}>
          {listed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {listed ? "Unlist trainer" : "List trainer"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{listed ? "Unlist this trainer" : "List this trainer"}</DialogTitle>
          <DialogDescription>
            {listed
              ? `${trainerName} disappears from client search and cannot get new booking requests. Existing bookings stay as they are.`
              : `${trainerName} shows in client search again at the current listing prices.`}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant={listed ? "destructive" : "default"} onClick={confirm} disabled={pending}>
            {pending ? "Saving..." : listed ? "Unlist" : "List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
