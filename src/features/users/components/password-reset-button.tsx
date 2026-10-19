"use client";

import { useState, useTransition } from "react";
import { Mail } from "@/components/icons";
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
import { showToast } from "@/stores/toast-store";

type PasswordResetResponse = { ok: true; sent: boolean } | { ok: false; error: { message: string } };

/**
 * Sends the account's password reset email through /api/users/password-reset (users.manage,
 * service role key). "Sent" shows only when the route says the email went out. Disabled with
 * the reason when the route could not run.
 */
export function PasswordResetButton({
  userId,
  email,
  disabledReason,
}: {
  userId: string;
  email: string | null;
  /** Service role key missing, or the account has no email address. */
  disabledReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (disabledReason) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="w-fit" disabled aria-describedby={`reset-blocked-${userId}`}>
          <Mail size={16} aria-hidden="true" />
          Send password reset email
        </Button>
        <p id={`reset-blocked-${userId}`} className="text-xs text-muted-foreground">
          {disabledReason}
        </p>
      </div>
    );
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      let body: PasswordResetResponse;
      try {
        const response = await fetch("/api/users/password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        body = (await response.json()) as PasswordResetResponse;
      } catch {
        body = { ok: false, error: { message: "Could not reach the server. Try again." } };
      }
      if (!body.ok) {
        setError(body.error.message);
        showToast("error", body.error.message);
        return;
      }
      if (body.sent) {
        setSent(true);
        showToast("success", "Password reset email sent.");
      }
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="w-fit">
            <Mail size={16} aria-hidden="true" />
            Send password reset email
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send password reset email</DialogTitle>
            <DialogDescription>
              {`A link to choose a new password goes to ${email ?? "the account's email address"}. The current password keeps working until it is changed.`}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? "Sending..." : "Send email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sent ? (
        <p role="status" className="text-xs text-success">
          Sent.
        </p>
      ) : null}
    </div>
  );
}
