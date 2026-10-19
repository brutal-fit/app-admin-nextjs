"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
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
          title="No admin roles"
          description="Without a role this person cannot sign in to the admin panel."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {assigned.map((role) => (
            <li key={role.roleId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {role.name}
                  {role.isSystem ? <Badge tone="warning">System</Badge> : null}
                </span>
                <span className="text-xs text-text-muted">
                  Granted {new Date(role.grantedAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              <Button
                size="sm"
                variant="danger"
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
        <div className="min-w-64">
          <Select
            id="assign-role"
            label="Assign a role"
            placeholder={options.length === 0 ? "Every role is assigned" : "Choose a role"}
            options={options}
            value={roleId}
            disabled={pending || options.length === 0}
            onChange={(event) => setRoleId(event.target.value)}
          />
        </div>
        <Button
          variant="primary"
          disabled={pending || !roleId}
          onClick={() => run(() => assignRoleAction({ userId, roleId }), "Role assigned.")}
        >
          {pending ? "Saving..." : "Assign"}
        </Button>
      </div>
    </div>
  );
}
