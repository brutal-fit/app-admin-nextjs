import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { ApplicationDetail } from "@/features/applications/components/application-detail";
import { DecisionForm } from "@/features/applications/components/decision-form";
import { DocumentList } from "@/features/applications/components/document-list";
import { loadApplicationDetail } from "@/features/applications/api";
import { applicationStatusTone } from "@/features/applications/format";
import { APPLICATION_STATUS_LABELS } from "@/features/applications/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const backLinkClass =
  "inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const access = await requireRoutePermission("/applications/[trainerId]");
  const { trainerId } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadApplicationDetail(supabase, access, trainerId);

  const backLink = (
    <Link href="/applications" className={backLinkClass}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back to applications
    </Link>
  );

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        {backLink}
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { application, username, documents, availability } = result;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        {backLink}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{application.full_name || "Unnamed"}</h1>
          <Badge variant="outline" className={applicationStatusTone(application.status)}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        </div>
        {application.reviewer_note ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Last note to the trainer: </span>
            {application.reviewer_note}
          </p>
        ) : null}
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
