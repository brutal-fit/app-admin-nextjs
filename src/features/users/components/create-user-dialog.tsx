"use client";

import { useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserSchema } from "@/features/users/schemas";
import type { AssignableRole } from "@/features/users/components/user-roles-panel";
import { SERVICE_ROLE_MISSING_MESSAGE } from "@/lib/supabase/errors";
import { showToast } from "@/stores/toast-store";

type CreateUserResponse =
  | { ok: true; userId: string }
  | { ok: false; error: { message: string } };

/**
 * Creates an auth account for a mobile number through /api/users/create, which needs the
 * service role key. Phone is the identity: no email or password is set here.
 */
export function CreateUserDialog({
  serviceRoleConfigured,
  roles,
  defaultOpen = false,
}: {
  serviceRoleConfigured: boolean;
  roles: AssignableRole[];
  /** From `?new=user` (the command palette's "Invite user"). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && serviceRoleConfigured);

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Drop ?new=user so a reload does not reopen the dialog.
    if (!next && defaultOpen) window.history.replaceState(null, "", window.location.pathname);
  }
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!serviceRoleConfigured) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button disabled>
          <UserPlus size={16} aria-hidden="true" />
          New user
        </Button>
        <p className="text-xs text-muted-foreground">{SERVICE_ROLE_MISSING_MESSAGE}</p>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = createUserSchema.safeParse({
      phone: form.get("phone"),
      fullName: form.get("fullName"),
      roleIds: form.getAll("roleIds"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setError(null);
    startTransition(async () => {
      let body: CreateUserResponse;
      try {
        const response = await fetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        body = (await response.json()) as CreateUserResponse;
      } catch {
        body = { ok: false, error: { message: "Could not reach the server. Try again." } };
      }
      if (!body.ok) {
        setError(body.error.message);
        showToast("error", body.error.message);
        return;
      }
      showToast("success", "User created.");
      onOpenChange(false);
      // A full refresh re-runs the server search so the new person appears.
      window.location.reload();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus size={16} aria-hidden="true" />
          New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            Creates a confirmed account for this mobile number. The person signs in to the app with
            a code texted to it. Signing in to this panel needs an email and password, which this
            form does not set.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input id="new-user-name" name="fullName" required disabled={pending} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-user-phone">Mobile number</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" aria-hidden="true">
                +91
              </span>
              <Input
                id="new-user-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={16}
                required
                disabled={pending}
                aria-describedby="new-user-phone-hint"
              />
            </div>
            <p id="new-user-phone-hint" className="text-xs text-muted-foreground">
              Ten digits, Indian numbers only.
            </p>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Admin roles</legend>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles exist yet.</p>
            ) : (
              roles.map((role) => {
                const id = `new-user-role-${role.id}`;
                return (
                  <div key={role.id} className="flex items-center gap-3">
                    {/* Inside a form the checkbox renders a hidden input, so getAll sees it. */}
                    <Checkbox id={id} name="roleIds" value={role.id} disabled={pending} />
                    <Label htmlFor={id} className="font-normal">
                      {role.name}
                    </Label>
                  </div>
                );
              })
            )}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
