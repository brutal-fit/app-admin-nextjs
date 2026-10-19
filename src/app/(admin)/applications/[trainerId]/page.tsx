import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { ApplicationDetail } from "@/features/applications/components/application-detail";
import { DecisionForm } from "@/features/applications/components/decision-form";
import { DocumentList } from "@/features/applications/components/document-list";
import { StatusTimeline } from "@/features/applications/components/status-timeline";
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

  const { application, username, documents, availability } = result;

  return (
    <div className="flex flex-col gap-8">
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

      <div className="rounded-xl border bg-card p-5 shadow-tile">
        <StatusTimeline
          status={application.status}
          createdAt={application.created_at}
          submittedAt={application.submitted_at}
          updatedAt={application.updated_at}
        />
      </div>

      <ApplicationDetail
        application={application}
        username={username}
        availability={availability}
        documents={
          documents === null ? (
            <p className="text-sm text-muted-foreground">
              Documents need the Review documents permission.
            </p>
          ) : (
            <DocumentList documents={documents} />
          )
        }
      />

      <section aria-labelledby="application-decision" className="flex flex-col gap-4">
        <h2 id="application-decision" className="text-lg font-semibold">
          Decision
        </h2>
        {can(access.permissions, "applications.review") ? (
          // Keyed on updated_at so the form starts fresh from what the server stored.
          <DecisionForm
            key={application.updated_at}
            trainerId={application.trainer_id}
            currentStatus={application.status}
            modes={application.modes}
            expectedHomeRateInr={application.expected_home_rate_inr}
            expectedOnlineRateInr={application.expected_online_rate_inr}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Decisions need the Approve or reject applications permission.
          </p>
        )}
      </section>
    </div>
  );
}
