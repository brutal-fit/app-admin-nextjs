"use client";

import { useState, useTransition } from "react";
import { UserX } from "@/components/icons";
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
import { removeStaffAction } from "@/features/my-gym/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Removes a staff member or withdraws an invite through gym_remove_staff, behind a
 * confirmation. The server keeps at least one active manager and says so. Gated by gym.self
 * and the gym's manager row.
 */
export function RemoveStaffButton({ staffId, label }: { staffId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await removeStaffAction({ staffId });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `${label} removed.`);
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
        <Button variant="ghost" size="sm" aria-label={`Remove ${label}`}>
          <UserX size={16} aria-hidden="true" />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {label}</DialogTitle>
          <DialogDescription>
            They can no longer be allotted to your sessions. Sessions already allotted to them stay
            as they are; reassign those under Requests.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
