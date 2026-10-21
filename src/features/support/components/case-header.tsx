import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { formatDateTime } from "@/features/applications/format";
import type { SupportCaseDetail } from "@/lib/db/support";
import { SupportPriorityBadge } from "@/features/support/components/support-priority-badge";
import { SupportStatusBadge } from "@/features/support/components/support-status-badge";
import { permittedHref, supportStatusTone } from "@/features/support/format";
import { SUPPORT_CATEGORY_LABELS } from "@/features/support/schemas";
import { toAvatarRef } from "@/lib/utils/avatar";

const BACK = { href: "/support", label: "Back to the queue" };

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * The top of a case: subject, status pill, priority, category, created, the reporter (a link
 * to /users/[id] with users.read) and what they wrote. Gated by support.read.
 */
export function CaseHeader({
  detail,
  permissions,
}: {
  detail: SupportCaseDetail;
  permissions: readonly string[];
}) {
  const { case: supportCase, reporter, assignee } = detail;
  const reporterName = reporter?.name || "Unnamed";
  const reporterHref = permittedHref(permissions, `/users/${supportCase.reporter_id}`);

  return (
    <PageHeader
      eyebrow="Support case"
      title={supportCase.subject}
      back={BACK}
      status={
        // Pulses once when an update comes back from the server with a new status.
        <StatusPulse value={supportCase.status} className={supportStatusTone(supportCase.status)}>
          <SupportStatusBadge status={supportCase.status} />
        </StatusPulse>
      }
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Meta label="Priority">
          <SupportPriorityBadge priority={supportCase.priority} />
        </Meta>
        <Meta label="Category">{SUPPORT_CATEGORY_LABELS[supportCase.category]}</Meta>
        <Meta label="Reporter">
          <span className="flex items-start gap-2">
            <Avatar
              name={reporterName}
              avatar={reporter ? toAvatarRef(reporter.avatar_path, reporter.avatar_preset) : null}
            />
            <span className="min-w-0">
              {reporterHref ? (
                <Link
                  href={reporterHref}
                  className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
                >
                  {reporterName}
                </Link>
              ) : (
                reporterName
              )}
              {reporter?.role ? (
                <span className="text-muted-foreground"> ({reporter.role})</span>
              ) : null}
              {reporter?.account_status === "suspended" ? (
                <span className="block text-xs text-destructive">Account suspended</span>
              ) : null}
            </span>
          </span>
        </Meta>
        <Meta label="Assignee">
          {assignee ? (
            <span className="flex items-center gap-2">
              <Avatar
                name={assignee.name || "Unnamed"}
                avatar={toAvatarRef(assignee.avatar_path, assignee.avatar_preset)}
              />
              {assignee.name || "Unnamed"}
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </Meta>
        <Meta label="Created">{formatDateTime(supportCase.created_at)}</Meta>
        <Meta label="Last change">{formatDateTime(supportCase.updated_at)}</Meta>
      </dl>
      <section
        aria-labelledby="case-report"
        className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-tile"
      >
        <h2 id="case-report" className="text-sm font-semibold">
          What {reporterName} reported
        </h2>
        <p className="text-sm whitespace-pre-wrap">
          {supportCase.details?.trim() ? (
            supportCase.details
          ) : (
            <span className="text-muted-foreground">No details given.</span>
          )}
        </p>
      </section>
    </PageHeader>
  );
}
