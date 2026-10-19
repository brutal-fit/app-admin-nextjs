import { PageHeader } from "@/components/layout/page-header";
import { CaseActionBar } from "@/features/support/components/case-action-bar";
import { CaseHeader } from "@/features/support/components/case-header";
import { CaseTargetCard } from "@/features/support/components/case-target-card";
import { CaseThread } from "@/features/support/components/case-thread";
import { loadSupportCase } from "@/features/support/api";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/support", label: "Back to the queue" };

export default async function SupportCasePage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/support/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadSupportCase(supabase, access, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Support case" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { detail, team } = result;
  const canManage = can(access.permissions, "support.manage");
  const canAssign = canManage && can(access.permissions, "support.assign");

  return (
    <div className="flex flex-col gap-8">
      <CaseHeader detail={detail} permissions={access.permissions} />
      <CaseTargetCard target={detail.target} permissions={access.permissions} />
      <CaseThread events={detail.events} />
      <div className="rounded-xl border bg-card p-5 shadow-tile">
        <CaseActionBar
          // Keyed on what the server stored, so the bar starts fresh after each update.
          key={`${detail.case.updated_at}|${detail.events.length}`}
          caseId={detail.case.id}
          status={detail.case.status}
          assignee={
            detail.assignee ? { id: detail.assignee.id, name: detail.assignee.name || "Unnamed" } : null
          }
          canManage={canManage}
          canAssign={canAssign}
          team={team}
        />
      </div>
    </div>
  );
}
