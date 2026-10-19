"use client";

import { useState, useTransition, type FormEvent } from "react";
import { UserCheck, UserX } from "@/components/icons";
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
import { setAccountStatusAction } from "@/features/users/actions";
import { ACCOUNT_REASON_MAX, setAccountStatusSchema } from "@/features/users/schemas";
import { showToast } from "@/stores/toast-store";
import type { AccountStatus } from "@/types/database";

/**
 * Suspend or reinstate, each behind a dialog that asks for a reason (the function refuses a
 * change without one). Gated by users.suspend. Nothing changes locally: the toast names the
 * status the server answered and the page re-reads the user. When the server would refuse
 * (own account, super admin) the button is disabled with that reason.
 */
export function AccountStatusControl({
  userId,
  userName,
  status,
  blockedReason,
}: {
  userId: string;
  userName: string;
  status: AccountStatus;
  /** Why suspending is refused, from the same checks the function makes. */
  blockedReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suspending = status === "active";
  const next: AccountStatus = suspending ? "suspended" : "active";
  const reasonId = `account-reason-${userId}`;
  const disabledReason = suspending ? blockedReason : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      userId,
      status: next,
      reason: String(new FormData(event.currentTarget).get("reason") ?? ""),
    };
    const parsed = setAccountStatusSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reason and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setAccountStatusAction(parsed.data);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast(
        "success",
        result.data.accountStatus === "suspended" ? `${userName} is suspended.` : `${userName} is active again.`,
      );
      setOpen(false);
    });
  }

  if (disabledReason) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="destructive" className="w-fit" disabled aria-describedby={`${reasonId}-blocked`}>
          <UserX size={16} aria-hidden="true" />
          Suspend account
        </Button>
        <p id={`${reasonId}-blocked`} className="text-xs text-muted-foreground">
          {disabledReason}
        </p>
      </div>
    );
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
        <Button variant={suspending ? "destructive" : "outline"} className="w-fit">
          {suspending ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
          {suspending ? "Suspend account" : "Reinstate account"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{suspending ? "Suspend account" : "Reinstate account"}</DialogTitle>
          <DialogDescription>
            {suspending
              ? `${userName} will not be able to book, message or train until reinstated. Existing bookings stay as they are.`
              : `${userName} can use BRUTAL again and gets a notification in the app.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>Reason (kept in the audit log)</Label>
            <Textarea
              id={reasonId}
              name="reason"
              required
              maxLength={ACCOUNT_REASON_MAX}
              disabled={pending}
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant={suspending ? "destructive" : "default"} disabled={pending}>
              {pending ? "Saving..." : suspending ? "Suspend" : "Reinstate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
