"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
          // role="group" with the title as its name does what a fieldset and legend did.
          <Card
            key={group.key}
            role="group"
            aria-labelledby={`permission-group-${group.key}`}
            className="gap-4 py-4"
          >
            <CardHeader className="px-4">
              <CardTitle id={`permission-group-${group.key}`} className="text-sm">
                {group.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
              {permissionsInGroup(group.key).map((permission) => {
                const id = `permission-${permission.key}`;
                return (
                  <div key={permission.key} className="flex items-start gap-3">
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      checked={selected.has(permission.key)}
                      disabled={locked}
                      onCheckedChange={(checked) => toggle(permission.key, checked === true)}
                    />
                    <Label htmlFor={id} className="flex flex-col items-start gap-1 font-normal">
                      <span>{permission.name}</span>
                      <code className="text-xs text-muted-foreground">{permission.key}</code>
                    </Label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {disabledReason ? (
          <p className="text-sm text-muted-foreground">{disabledReason}</p>
        ) : dirty ? (
          <p className="text-sm text-muted-foreground">Unsaved changes.</p>
        ) : null}
        <Button onClick={save} disabled={locked || !dirty}>
          {pending ? "Saving..." : "Save permissions"}
        </Button>
      </div>
    </div>
  );
}
