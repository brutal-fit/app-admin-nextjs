"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createUserSchema } from "@/features/users/schemas";
import type { AssignableRole } from "@/features/users/components/user-roles-panel";
import { SERVICE_ROLE_MISSING_MESSAGE } from "@/lib/supabase/errors";
import { showToast } from "@/stores/toast-store";

type CreateUserResponse =
  | { ok: true; userId: string }
  | { ok: false; error: { message: string } };

/** Creates an auth account through /api/users/create, which needs the service role key. */
export function CreateUserDialog({
  serviceRoleConfigured,
  roles,
}: {
  serviceRoleConfigured: boolean;
  roles: AssignableRole[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!serviceRoleConfigured) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="primary" disabled>
          New user
        </Button>
        <p className="text-xs text-text-muted">{SERVICE_ROLE_MISSING_MESSAGE}</p>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = createUserSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
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
      setOpen(false);
      // A full refresh re-runs the server search so the new person appears.
      window.location.reload();
    });
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        New user
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New user"
        description="Creates a confirmed account with this password. Share it privately."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input id="new-user-name" name="fullName" label="Full name" required disabled={pending} />
          <Input
            id="new-user-email"
            name="email"
            type="email"
            label="Email"
            autoComplete="off"
            required
            disabled={pending}
          />
          <Input
            id="new-user-password"
            name="password"
            type="password"
            label="Temporary password"
            hint="At least 8 characters."
            autoComplete="new-password"
            required
            disabled={pending}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Admin roles</legend>
            {roles.length === 0 ? (
              <p className="text-sm text-text-muted">No roles exist yet.</p>
            ) : (
              roles.map((role) => (
                <label key={role.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    disabled={pending}
                    className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-accent"
                  />
                  {role.name}
                </label>
              ))
            )}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Creating..." : "Create user"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
