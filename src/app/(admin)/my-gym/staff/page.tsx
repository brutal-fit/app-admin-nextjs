import { PageHeader } from "@/components/layout/page-header";
import { GymSwitcher } from "@/features/my-gym/components/gym-switcher";
import { InviteStaffDialog } from "@/features/my-gym/components/invite-staff-dialog";
import { MyGymUnavailable } from "@/features/my-gym/components/my-gym-unavailable";
import { StaffList } from "@/features/my-gym/components/staff-list";
import { loadStaffPage, resolveMyGym } from "@/features/my-gym/api";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyGymStaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/my-gym/staff");
  const context = await resolveMyGym((await searchParams).gym);
  if (context.status !== "ok") {
    return <MyGymUnavailable title="Staff" error={context.status === "error" ? context.message : null} />;
  }
  const supabase = await createSupabaseServerClient();
  const result = await loadStaffPage(supabase, context.current.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={context.current.name}
        title="Staff"
        description="Your managers and trainers. Invite people by mobile number; they join when that number signs in to BRUTAL. Only active trainers can be allotted to sessions."
        actions={<InviteStaffDialog gymId={context.current.id} />}
      >
        <GymSwitcher gyms={context.gyms} currentId={context.current.id} path="/my-gym/staff" />
      </PageHeader>
      {result.ok ? (
        <StaffList staff={result.staff} selfUserId={access.userId} />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
