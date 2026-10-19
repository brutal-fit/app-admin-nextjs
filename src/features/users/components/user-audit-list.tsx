import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { formatDateTime } from "@/features/applications/format";
import { permittedHref } from "@/features/support/format";
import { describeUserAuditEntry } from "@/features/users/format";
import type { UserAuditEntry } from "@/lib/db/users";

/**
 * The five latest audit entries whose target is this user, from admin_get_user_detail. The
 * full log link shows once the audit page exists and the session holds its key.
 */
export function UserAuditList({
  userId,
  entries,
  permissions,
}: {
  userId: string;
  entries: readonly UserAuditEntry[];
  permissions: readonly string[];
}) {
  const auditHref = permittedHref(permissions, `/audit?target=${encodeURIComponent(userId)}`);

  return (
    <section aria-labelledby="user-audit" className="flex max-w-3xl flex-col gap-3">
      <h2 id="user-audit" className="text-lg font-semibold">
        Audit
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No admin actions on this account yet.</p>
      ) : (
        <ol className="flex flex-col divide-y rounded-xl border bg-card shadow-tile">
          {entries.map((entry) => (
            <li key={String(entry.id)} className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:justify-between sm:gap-4">
              <p>
                <span className="font-medium">{entry.actor_name || "Someone"}</span>{" "}
                {describeUserAuditEntry(entry)}
              </p>
              <time dateTime={entry.created_at} className="shrink-0 text-muted-foreground">
                {formatDateTime(entry.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}
      {auditHref ? (
        <Link
          href={auditHref}
          className="focus-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline"
        >
          Full audit log for this user
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
