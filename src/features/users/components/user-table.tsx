"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar/avatar";
import { ArrowRight, Users } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { UserAvatarMap } from "@/lib/db/avatars";
import type { AdminUserRow } from "@/types/database";

function statusTone(status: AdminUserRow["account_status"]): string {
  return status === "active" ? "border-success text-success" : "border-destructive text-destructive";
}

const columns = (avatars: UserAvatarMap): DataTableColumn<AdminUserRow>[] => [
  {
    id: "name",
    header: "Name",
    sortValue: (user) => user.full_name || null,
    cell: (user) => (
      <span className="flex items-center gap-2">
        <Avatar name={user.full_name} avatar={avatars[user.id]} />
        <Link
          href={`/users/${user.id}`}
          className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
        >
          {user.full_name || "Unnamed"}
        </Link>
      </span>
    ),
  },
  {
    id: "email",
    header: "Email",
    sortValue: (user) => user.email ?? null,
    cell: (user) => user.email ?? "No email",
  },
  {
    id: "platform",
    header: "Platform role",
    sortValue: (user) => user.platform_role ?? null,
    cell: (user) => user.platform_role ?? <span className="text-muted-foreground">None</span>,
  },
  {
    id: "status",
    header: "Status",
    sortValue: (user) => user.account_status,
    cell: (user) => (
      <StatusPulse value={user.account_status} className={statusTone(user.account_status)}>
        <Badge variant="outline" className={statusTone(user.account_status)}>
          {user.account_status}
        </Badge>
      </StatusPulse>
    ),
  },
  {
    id: "roles",
    header: "Admin roles",
    sortValue: (user) => user.roles.length,
    cell: (user) =>
      user.roles.length === 0 ? (
        <span className="text-muted-foreground">None</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} variant="outline" className="text-muted-foreground">
              {role}
            </Badge>
          ))}
        </span>
      ),
  },
  {
    id: "joined",
    header: "Joined",
    sortValue: (user) => (user.created_at ? new Date(user.created_at).getTime() : null),
    cell: (user) =>
      user.created_at ? (
        new Date(user.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
      ) : (
        <span className="text-muted-foreground">Unknown</span>
      ),
  },
];

export function UserTable({
  users,
  avatars = {},
  loading = false,
  toolbar,
  countLabel,
  emptyDescription = "Try a different name or email.",
}: {
  users: AdminUserRow[];
  /** Avatars by user id from admin_user_avatars; a missing id shows initials. */
  avatars?: UserAvatarMap;
  loading?: boolean;
  toolbar?: ReactNode;
  countLabel?: (count: number) => string;
  emptyDescription?: string;
}) {
  return (
    <DataTable
      rows={users}
      columns={columns(avatars)}
      rowKey={(user) => user.id}
      caption="Users"
      loading={loading}
      toolbar={toolbar}
      countLabel={countLabel ?? ((count) => `${count} ${count === 1 ? "user" : "users"}`)}
      empty={<EmptyState icon={Users} title="No users found" description={emptyDescription} />}
      rowActions={(user) => (
        <Link
          href={`/users/${user.id}`}
          aria-label={`Open ${user.full_name || "this user"}`}
          tabIndex={-1}
          className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
        >
          Open
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    />
  );
}
