import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS, staffStatusTone } from "@/features/gyms/format";
import { formatDateTime } from "@/features/applications/format";
import { permittedHref } from "@/features/support/format";
import { describePhone } from "@/features/users/format";
import type { GymStaffMember } from "@/lib/db/gyms-manager";

/**
 * The gym's managers and trainers from admin_get_gym, invites included. A name shows once the
 * invite has bound to an account; the user link needs users.read.
 */
export function GymStaffTable({
  staff,
  permissions,
}: {
  staff: readonly GymStaffMember[];
  permissions: readonly string[];
}) {
  if (staff.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-tile">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => {
            const userHref = member.user_id ? permittedHref(permissions, `/users/${member.user_id}`) : null;
            const phone = describePhone(member.phone);
            return (
              <TableRow key={member.id}>
                <TableCell>
                  {member.name ? (
                    userHref ? (
                      <Link href={userHref} className="focus-ring rounded-sm underline-offset-4 hover:underline">
                        {member.name}
                      </Link>
                    ) : (
                      member.name
                    )
                  ) : (
                    <span className="text-muted-foreground">Not joined yet</span>
                  )}
                </TableCell>
                <TableCell>
                  <span aria-label={phone.label}>{phone.text}</span>
                </TableCell>
                <TableCell>{STAFF_ROLE_LABELS[member.role]}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={staffStatusTone(member.status)}>
                    {STAFF_STATUS_LABELS[member.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(member.invited_at)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
