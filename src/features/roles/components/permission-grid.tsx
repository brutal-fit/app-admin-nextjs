"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PERMISSION_GROUPS, permissionsInGroup, type PermissionKey } from "@/lib/rbac/permissions";
import { setRolePermissionsAction } from "@/features/roles/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Permission checkboxes grouped by registry group. Saving replaces the role's whole set on
 * the server; the page then re-renders from what the server stored.
 */
export function PermissionGrid({
  roleId,
  savedKeys,
  disabledReason,
}: {
  roleId: string;
  savedKeys: string[];
  disabledReason?: string;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(savedKeys));
  const [pending, startTransition] = useTransition();
  const locked = pending || Boolean(disabledReason);
  const dirty =
    selected.size !== savedKeys.length || savedKeys.some((key) => !selected.has(key));

  function toggle(key: PermissionKey, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await setRolePermissionsAction({
        roleId,
        permissionKeys: [...selected],
      });
      if (!result.ok) {
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Permissions saved.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset
            key={group.key}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
          >
            <legend className="px-1 text-sm font-semibold">{group.name}</legend>
            {permissionsInGroup(group.key).map((permission) => (
              <label key={permission.key} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-accent focus-visible:outline-2 focus-visible:outline-accent"
                  checked={selected.has(permission.key)}
                  disabled={locked}
                  onChange={(event) => toggle(permission.key, event.target.checked)}
                />
                <span className="flex flex-col">
                  <span className="text-text">{permission.name}</span>
                  <code className="text-xs text-text-subtle">{permission.key}</code>
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {disabledReason ? (
          <p className="text-sm text-text-muted">{disabledReason}</p>
        ) : dirty ? (
          <p className="text-sm text-text-muted">Unsaved changes.</p>
        ) : null}
        <Button variant="primary" onClick={save} disabled={locked || !dirty}>
          {pending ? "Saving..." : "Save permissions"}
        </Button>
      </div>
    </div>
  );
}
