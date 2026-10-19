"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoleAction, updateRoleAction } from "@/features/roles/actions";
import { showToast } from "@/stores/toast-store";

type RoleFormProps =
  | { mode: "create"; onDone?: () => void }
  | {
      mode: "edit";
      role: { id: string; name: string; description: string; isAdmin: boolean };
      disabledReason?: string;
      onDone?: () => void;
    };

/** Create a role (key, name, description, admin flag) or edit an existing role's details. */
export function RoleForm(props: RoleFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabledReason = props.mode === "edit" ? props.disabledReason : undefined;
  const locked = pending || Boolean(disabledReason);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const description = String(form.get("description") ?? "");
    const isAdmin = form.get("isAdmin") === "on";
    setError(null);
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createRoleAction({
              key: String(form.get("key") ?? ""),
              name,
              description,
              isAdmin,
            })
          : await updateRoleAction({ id: props.role.id, name, description, isAdmin });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", props.mode === "create" ? "Role created." : "Role saved.");
      props.onDone?.();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {props.mode === "create" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="role-key">Key</Label>
          <Input
            id="role-key"
            name="key"
            pattern="^[a-z][a-z0-9_]{2,40}$"
            required
            disabled={locked}
            autoComplete="off"
            aria-describedby="role-key-hint"
          />
          <p id="role-key-hint" className="text-xs text-muted-foreground">
            Lowercase letters, digits and underscores, starting with a letter. Cannot change later.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="role-name">Name</Label>
        <Input
          id="role-name"
          name="name"
          required
          disabled={locked}
          defaultValue={props.mode === "edit" ? props.role.name : undefined}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="role-description">Description</Label>
        <Input
          id="role-description"
          name="description"
          disabled={locked}
          defaultValue={props.mode === "edit" ? props.role.description : undefined}
        />
      </div>
      <div className="flex items-start gap-3">
        {/* Inside a form the checkbox renders a hidden input, so FormData sees "on". */}
        <Checkbox
          id="role-is-admin"
          name="isAdmin"
          className="mt-0.5"
          disabled={locked}
          defaultChecked={props.mode === "edit" ? props.role.isAdmin : true}
          aria-describedby="role-is-admin-hint"
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="role-is-admin">Grants admin panel access</Label>
          <p id="role-is-admin-hint" className="text-xs text-muted-foreground">
            People holding this role can sign in to this panel.
          </p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {disabledReason ? <p className="text-sm text-muted-foreground">{disabledReason}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={locked}>
          {pending ? "Saving..." : props.mode === "create" ? "Create role" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
