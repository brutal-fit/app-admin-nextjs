import Link from "next/link";
import { Users } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUserRow } from "@/types/database";

export function UserTable({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return (
      <EmptyState icon={Users} title="No users found" description="Try a different name or email." />
    );
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableCaption className="sr-only">Users</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Name</TableHead>
            <TableHead className="px-4">Email</TableHead>
            <TableHead className="px-4">Platform role</TableHead>
            <TableHead className="px-4">Status</TableHead>
            <TableHead className="px-4">Admin roles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="px-4">
                <Link
                  href={`/users/${user.id}`}
                  className="font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {user.full_name || "Unnamed"}
                </Link>
              </TableCell>
              <TableCell className="px-4">{user.email ?? "No email"}</TableCell>
              <TableCell className="px-4">
                {user.platform_role ?? <span className="text-muted-foreground">None</span>}
              </TableCell>
              <TableCell className="px-4">
                <Badge
                  variant="outline"
                  className={
                    user.account_status === "active"
                      ? "border-success text-success"
                      : "border-destructive text-destructive"
                  }
                >
                  {user.account_status}
                </Badge>
              </TableCell>
              <TableCell className="px-4">
                {user.roles.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-muted-foreground">
                        {role}
                      </Badge>
                    ))}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
