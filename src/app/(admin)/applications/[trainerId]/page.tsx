import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { ApplicationDetail } from "@/features/applications/components/application-detail";
import { ReviewPanel } from "@/features/applications/components/review-panel";
import { loadApplicationDetail } from "@/features/applications/api";
import { applicationStatusTone } from "@/features/applications/format";
import { APPLICATION_STATUS_LABELS } from "@/features/applications/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/applications", label: "Back to applications" };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const access = await requireRoutePermission("/applications/[trainerId]");
  const { trainerId } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadApplicationDetail(supabase, access, trainerId);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Application" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { application, username, documents, availability, history } = result;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Trainer application"
        title={application.full_name || "Unnamed"}
        back={BACK}
        status={
          // Pulses once when a decision comes back from the server with a new status.
          <StatusPulse value={application.status} className={applicationStatusTone(application.status)}>
            <Badge variant="outline" className={applicationStatusTone(application.status)}>
              {APPLICATION_STATUS_LABELS[application.status]}
            </Badge>
          </StatusPulse>
        }
        description={
          application.reviewer_note ? (
            <p>
              <span className="font-medium text-foreground">Last note to the trainer: </span>
              {application.reviewer_note}
            </p>
          ) : undefined
        }
      />

      {/* Facts on the left, read-only; the review on the right as one checklist. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <ApplicationDetail application={application} username={username} availability={availability} />
        <ReviewPanel
          application={application}
          documents={documents}
          history={history}
          canDecide={can(access.permissions, "applications.review")}
          trainerHref={
            can(access.permissions, "trainers.read") ? `/trainers/${application.trainer_id}` : null
          }
        />
      </div>
    </div>
  );
}
