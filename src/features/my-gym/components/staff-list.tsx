import { Users } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/features/applications/format";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS, staffStatusTone } from "@/features/gyms/format";
import { RemoveStaffButton } from "@/features/my-gym/components/remove-staff-button";
import { describePhone } from "@/features/users/format";
import type { GymStaffRow } from "@/types/database";

/**
 * The gym's managers and trainers with invites, read as the manager (gym_staff rows, which
 * carry the phone but no name). Removed staff are listed last without an action.
 */
export function StaffList({ staff, selfUserId }: { staff: readonly GymStaffRow[]; selfUserId: string }) {
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
            return (
              <TableRow key={member.id}>
                <TableCell>
                  <span aria-label={phone.label}>{phone.text}</span>
                  {self ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
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
                      label={`${STAFF_ROLE_LABELS[member.role].toLowerCase()} ${phone.text}`}
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
