import Link from "next/link";
import { Shield } from "@/components/icons";
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
import type { RoleSummary } from "@/lib/db/rbac";

export function RoleTable({ roles }: { roles: RoleSummary[] }) {
  if (roles.length === 0) {
    return <EmptyState icon={Shield} title="No roles yet" description="Create the first role." />;
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableCaption className="sr-only">Roles</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Name</TableHead>
            <TableHead className="px-4">Key</TableHead>
            <TableHead className="px-4">Permissions</TableHead>
            <TableHead className="px-4">Type</TableHead>
            <TableHead className="px-4">Panel access</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="px-4">
                <Link
                  href={`/roles/${role.id}`}
                  className="font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {role.name}
                </Link>
              </TableCell>
              <TableCell className="px-4">
                <code className="text-xs text-muted-foreground">{role.key}</code>
              </TableCell>
              <TableCell className="px-4">{role.permissionCount}</TableCell>
              <TableCell className="px-4">
                {role.is_system ? (
                  <Badge variant="outline" className="border-warning text-warning">
                    System
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Custom
                  </Badge>
                )}
              </TableCell>
              <TableCell className="px-4">
                {role.is_admin ? (
                  <Badge variant="outline" className="border-success text-success">
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    No panel access
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
