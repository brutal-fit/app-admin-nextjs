"use client";

import { useState, useTransition } from "react";
import { Shield } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/features/applications/format";
import { assignRoleAction, revokeRoleAction } from "@/features/users/actions";
import { showToast } from "@/stores/toast-store";

export type AssignedRole = {
  roleId: string;
  key: string;
  name: string;
  isSystem: boolean;
  grantedAt: string;
};

export type AssignableRole = { id: string; name: string; key: string };

/** The user's admin roles with assign and revoke. Rendered only for users.manage. */
export function UserRolesPanel({
  userId,
  assigned,
  available,
}: {
  userId: string;
  assigned: AssignedRole[];
  available: AssignableRole[];
}) {
  const [roleId, setRoleId] = useState("");
  const [pending, startTransition] = useTransition();
  const assignedIds = new Set(assigned.map((role) => role.roleId));
  const options = available
    .filter((role) => !assignedIds.has(role.id))
    .map((role) => ({ value: role.id, label: `${role.name} (${role.key})` }));
  const noOptions = options.length === 0;

  function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>, done: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        showToast("error", result.error?.message ?? "Something went wrong. Try again.");
        return;
      }
      showToast("success", done);
      setRoleId("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {assigned.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No admin roles"
          description="Without a role this person cannot sign in to the admin panel."
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {assigned.map((role) => (
            <li
              key={role.roleId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {role.name}
                  {role.isSystem ? (
                    <Badge variant="outline" className="border-warning text-warning">
                      System
                    </Badge>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  Granted <time dateTime={role.grantedAt}>{formatDateTime(role.grantedAt)}</time>
                </span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  run(
                    () => revokeRoleAction({ userId, roleId: role.roleId }),
                    `Revoked ${role.name}.`,
                  )
                }
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-col gap-2">
          <Label htmlFor="assign-role">Assign a role</Label>
          {/* An empty value shows the placeholder, which is how the choice resets after a save. */}
          <Select value={roleId} onValueChange={setRoleId} disabled={pending || noOptions}>
            <SelectTrigger id="assign-role" className="w-full">
              <SelectValue placeholder={noOptions ? "Every role is assigned" : "Choose a role"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={pending || !roleId}
          onClick={() => run(() => assignRoleAction({ userId, roleId }), "Role assigned.")}
        >
          {pending ? "Saving..." : "Assign"}
        </Button>
      </div>
    </div>
  );
}
