import { Users } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/features/applications/format";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS, staffStatusTone } from "@/features/gyms/format";
import { RemoveStaffButton } from "@/features/my-gym/components/remove-staff-button";
import { staffDisplayName } from "@/features/my-gym/format";
import { describePhone } from "@/features/users/format";
import type { GymStaffMember } from "@/lib/db/gyms-manager";

/**
 * The gym's managers and trainers with invites, read as the manager through gym_list_staff:
 * name (once the invite has bound to an account), phone, role and status. Removed staff,
 * should a row come back, are listed last without an action.
 */
export function StaffList({ staff, selfUserId }: { staff: readonly GymStaffMember[]; selfUserId: string }) {
  if (staff.length === 0) {
    return <EmptyState icon={Users} title="No staff yet" description="Invite your trainers by their mobile numbers." />;
  }
  const ordered = [...staff].sort(
    (a, b) => Number(a.status === "removed") - Number(b.status === "removed") || a.role.localeCompare(b.role),
  );
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
            <TableHead>Joined</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((member) => {
            const phone = describePhone(member.phone);
            const self = member.user_id !== null && member.user_id === selfUserId;
            const name = member.name?.trim() || null;
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {name ?? <span className="font-normal text-muted-foreground">Joins on sign-in</span>}
                  {self ? <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span> : null}
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
                <TableCell className="text-muted-foreground">
                  {member.joined_at ? formatDateTime(member.joined_at) : "Not yet"}
                </TableCell>
                <TableCell className="text-right">
                  {member.status !== "removed" ? (
                    <RemoveStaffButton
                      staffId={member.id}
                      label={`${STAFF_ROLE_LABELS[member.role].toLowerCase()} ${staffDisplayName(member)}`}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
