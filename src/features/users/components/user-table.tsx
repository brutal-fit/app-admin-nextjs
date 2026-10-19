import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table } from "@/components/ui/table";
import type { AdminUserRow } from "@/types/database";

export function UserTable({ users }: { users: AdminUserRow[] }) {
  return (
    <Table
      caption="Users"
      rows={users}
      rowKey={(user) => user.id}
      empty={<EmptyState title="No users found" description="Try a different name or email." />}
      columns={[
        {
          key: "name",
          header: "Name",
          cell: (user) => (
            <Link
              href={`/users/${user.id}`}
              className="font-medium text-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {user.full_name || "Unnamed"}
            </Link>
          ),
        },
        { key: "email", header: "Email", cell: (user) => user.email ?? "No email" },
        {
          key: "platform",
          header: "Platform role",
          cell: (user) => user.platform_role ?? <span className="text-text-muted">None</span>,
        },
        {
          key: "status",
          header: "Status",
          cell: (user) => (
            <Badge tone={user.account_status === "active" ? "success" : "danger"}>
              {user.account_status}
            </Badge>
          ),
        },
        {
          key: "roles",
          header: "Admin roles",
          cell: (user) =>
            user.roles.length === 0 ? (
              <span className="text-text-muted">None</span>
            ) : (
              <span className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <Badge key={role}>{role}</Badge>
                ))}
              </span>
            ),
        },
      ]}
    />
  );
}
