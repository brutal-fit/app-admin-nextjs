import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { CoachingDetail } from "@/features/coaching/components/coaching-detail";
import { CoachingStatusBadge } from "@/features/coaching/components/coaching-status-badge";
import { EndCoachingDialog } from "@/features/coaching/components/end-coaching-dialog";
import { loadCoachingDetail } from "@/features/coaching/api";
import { COACHING_STATUS_LABELS, isCoachingEndable } from "@/features/coaching/schemas";
import { subscriptionStatusTone } from "@/features/subscriptions/format";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/coaching", label: "Back to coaching" };

export default async function CoachingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/coaching/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadCoachingDetail(supabase, access, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Coaching" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { coaching } = result;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Coaching"
        title={result.planTitle ?? "Coaching"}
        back={BACK}
        status={
          // Pulses once when an end comes back from the server with a new status.
          <StatusPulse value={coaching.status} className={subscriptionStatusTone(coaching.status)}>
            <CoachingStatusBadge status={coaching.status} />
          </StatusPulse>
        }
      />

      <CoachingDetail
        coaching={coaching}
        periods={result.periods}
        names={result.names}
        planTitle={result.planTitle}
        permissions={access.permissions}
      />

      <section aria-labelledby="coaching-actions" className="flex flex-col gap-3">
        <h2 id="coaching-actions" className="text-lg font-semibold">
          Actions
        </h2>
        {!can(access.permissions, "bookings.cancel") ? (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("bookings.cancel", "Ending a coaching")}
          </p>
        ) : isCoachingEndable(coaching.status) ? (
          <EndCoachingDialog coachingId={coaching.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            A coaching that is {COACHING_STATUS_LABELS[coaching.status].toLowerCase()} cannot be ended again.
          </p>
        )}
      </section>
    </div>
  );
}
