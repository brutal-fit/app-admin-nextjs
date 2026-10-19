import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/applications/format";
import { PrivacyRequestDialog } from "@/features/users/components/privacy-request-dialog";
import {
  PRIVACY_FINAL_STATUSES,
  PRIVACY_KIND_LABELS,
  missingPermissionMessage,
  privacyStatusLabel,
  privacyStatusTone,
} from "@/features/users/format";
import type { PrivacyRequest } from "@/lib/db/users";

/**
 * Every data export and account deletion request this user made, newest first, from
 * admin_get_user_detail. Waiting requests carry the process actions (privacy.process);
 * without the key the list stays readable and says which key processing needs.
 */
export function UserPrivacyRequests({
  requests,
  canProcess,
}: {
  requests: readonly PrivacyRequest[];
  canProcess: boolean;
}) {
  const waiting = requests.some((request) => !PRIVACY_FINAL_STATUSES.includes(request.status));

  return (
    <section aria-labelledby="user-privacy" className="flex max-w-3xl flex-col gap-3">
      <h2 id="user-privacy" className="text-lg font-semibold">
        Privacy requests
      </h2>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data export or deletion requests.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => {
            const kindLabel = PRIVACY_KIND_LABELS[request.kind];
            const open = !PRIVACY_FINAL_STATUSES.includes(request.status);
            return (
              <li key={request.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-tile">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{kindLabel}</span>
                  <Badge variant="outline" className={privacyStatusTone(request.status)}>
                    {privacyStatusLabel(request.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Requested {formatDateTime(request.created_at)}
                  </span>
                </div>
                {request.reason ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reason given: </span>
                    {request.reason}
                  </p>
                ) : null}
                {request.resolved_at ? (
                  <p className="text-sm text-muted-foreground">
                    Processed {formatDateTime(request.resolved_at)}
                    {request.resolution_note ? `: ${request.resolution_note}` : ""}
                  </p>
                ) : null}
                {open && canProcess ? (
                  <div className="flex flex-wrap gap-2">
                    <PrivacyRequestDialog requestId={request.id} kindLabel={kindLabel} outcome="completed" />
                    <PrivacyRequestDialog requestId={request.id} kindLabel={kindLabel} outcome="rejected" />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {waiting && !canProcess ? (
        <p className="text-sm text-muted-foreground">
          {missingPermissionMessage("privacy.process", "Processing a request")}
        </p>
      ) : null}
    </section>
  );
}
