"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRoleAction, updateRoleAction } from "@/features/roles/actions";
import { showToast } from "@/stores/toast-store";

type RoleFormProps =
  | { mode: "create"; onDone?: () => void }
  | {
      mode: "edit";
      role: { id: string; name: string; description: string };
      disabledReason?: string;
      onDone?: () => void;
    };

/** Create a role (key, name, description) or edit an existing role's name and description. */
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
    setError(null);
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createRoleAction({ key: String(form.get("key") ?? ""), name, description })
          : await updateRoleAction({ id: props.role.id, name, description });
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
        <Input
          id="role-key"
          name="key"
          label="Key"
          hint="Lowercase letters, digits and underscores, starting with a letter. Cannot change later."
          pattern="^[a-z][a-z0-9_]{2,40}$"
          required
          disabled={locked}
          autoComplete="off"
        />
      ) : null}
      <Input
        id="role-name"
        name="name"
        label="Name"
        required
        disabled={locked}
        defaultValue={props.mode === "edit" ? props.role.name : undefined}
      />
      <Input
        id="role-description"
        name="description"
        label="Description"
        disabled={locked}
        defaultValue={props.mode === "edit" ? props.role.description : undefined}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {disabledReason ? <p className="text-sm text-text-muted">{disabledReason}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={locked}>
          {pending ? "Saving..." : props.mode === "create" ? "Create role" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
