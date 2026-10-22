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
import { setGymListedAction } from "@/features/gyms/actions";
import { showToast } from "@/stores/toast-store";

/**
 * The listing switch through admin_set_gym_listed: a verified gym goes live, a listed one goes
 * back to verified. Listing needs a verified gym; the page says so for other statuses and the
 * server refuses in its own words. Gated by gyms.manage.
 */
export function GymListingToggle({
  gymId,
  gymName,
  listed,
}: {
  gymId: string;
  gymName: string;
  listed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = !listed;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await setGymListedAction({ gymId, listed: next });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", next ? `${gymName} is live.` : `${gymName} is no longer listed.`);
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
        <Button variant={listed ? "outline" : "default"}>
          {listed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {listed ? "Unlist gym" : "List gym"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{listed ? "Unlist this gym" : "List this gym"}</DialogTitle>
          <DialogDescription>
            {listed
              ? `${gymName} disappears from the app and takes no new bookings. Existing bookings stay as they are.`
              : `${gymName} shows in the app and clients can book its services that have a platform price.`}
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
