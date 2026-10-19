import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/applications/format";
import type { SupportCaseDetail, SupportTargetDetail } from "@/lib/db/support";
import { routePermission } from "@/lib/rbac/permissions";
import { excerpt, permittedHref } from "@/features/support/format";

type Target = NonNullable<SupportCaseDetail["target"]>;

function words(value: string | null | undefined): string {
  return value ? value.replace(/_/g, " ") : "Not given";
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function PersonLink({
  id,
  name,
  permissions,
}: {
  id: string | null | undefined;
  name: string | null | undefined;
  permissions: readonly string[];
}) {
  const label = name || "Unnamed";
  const href = id ? permittedHref(permissions, `/users/${id}`) : null;
  return href ? (
    <Link href={href} className="focus-ring rounded-sm underline-offset-4 hover:underline">
      {label}
    </Link>
  ) : (
    <>{label}</>
  );
}

function OpenLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <Link
      href={href}
      className="focus-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline"
    >
      {label}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

function Detail({
  detail,
  permissions,
}: {
  detail: SupportTargetDetail;
  permissions: readonly string[];
}) {
  switch (detail.kind) {
    case "booking": {
      const href = permittedHref(permissions, `/bookings/${detail.id}`);
      return (
        <>
          <dl className="flex flex-col gap-2">
            <Row label="Session">{detail.service_title || "Untitled session"}</Row>
            <Row label="When">
              {formatDateTime(detail.start_at ?? null)}
              {detail.mode ? <span className="text-muted-foreground"> ({detail.mode})</span> : null}
            </Row>
            <Row label="Client">
              <PersonLink id={detail.client_id} name={detail.client_name} permissions={permissions} />
            </Row>
            <Row label="Trainer">
              <PersonLink id={detail.trainer_id} name={detail.trainer_name} permissions={permissions} />
            </Row>
            <Row label="Status">
              <span className="capitalize">{words(detail.status)}</span>
              {detail.payment_status ? (
                <span className="text-muted-foreground">, payment {words(detail.payment_status)}</span>
              ) : null}
            </Row>
          </dl>
          {href ? (
            <OpenLink href={href} label="Open the booking" />
          ) : (
            <p className="text-xs text-muted-foreground">
              {routePermission(`/bookings/${detail.id}`)
                ? "Opening the booking needs the View bookings permission."
                : "There is no bookings page in the panel yet."}
            </p>
          )}
        </>
      );
    }
    case "user":
      return (
        <>
          <dl className="flex flex-col gap-2">
            <Row label="Name">{detail.name || "Unnamed"}</Row>
            <Row label="Username">{detail.username ? `@${detail.username}` : "None"}</Row>
            <Row label="Role">
              <span className="capitalize">{words(detail.role)}</span>
            </Row>
            <Row label="Account">
              <span className="capitalize">{words(detail.account_status)}</span>
            </Row>
          </dl>
          <OpenLink href={permittedHref(permissions, `/users/${detail.id}`)} label="Open the user" />
        </>
      );
    case "review":
      return (
        <dl className="flex flex-col gap-2">
          <Row label="Rating">
            {typeof detail.rating === "number" ? `${detail.rating} of 5` : "Not given"}
          </Row>
          <Row label="Written by">{detail.author_display_name || "Unnamed"}</Row>
          <Row label="Text">
            <span className="whitespace-pre-wrap">{detail.body?.trim() || "No text."}</span>
          </Row>
          <Row label="Visibility">
            {detail.hidden ? (
              <Badge variant="outline" className="text-muted-foreground">
                Hidden
              </Badge>
            ) : (
              "Shown in the app"
            )}
          </Row>
        </dl>
      );
    case "message":
      return (
        <dl className="flex flex-col gap-2">
          <Row label="Sent by">
            <PersonLink id={detail.sender_id} name={detail.sender_name} permissions={permissions} />
          </Row>
          <Row label="Sent">{formatDateTime(detail.created_at ?? null)}</Row>
          <Row label="Excerpt">{excerpt(detail.body) || "Empty message."}</Row>
        </dl>
      );
  }
}

/**
 * What the case is about, by target type: a booking (date, parties, status, link), a user
 * (name, role), a review (rating and text) or a message (excerpt). Links appear only for
 * pages the session may open. Gated by support.read.
 */
export function CaseTargetCard({
  target,
  permissions,
}: {
  target: Target | null | undefined;
  permissions: readonly string[];
}) {
  return (
    <section
      aria-labelledby="case-target"
      className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-tile"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="case-target" className="text-sm font-semibold">
          Linked to
        </h2>
        {target?.label ? <p className="text-sm text-muted-foreground">{target.label}</p> : null}
      </div>
      {!target ? (
        <p className="text-sm text-muted-foreground">This case is not linked to a booking, user, review or message.</p>
      ) : target.detail ? (
        <Detail detail={target.detail} permissions={permissions} />
      ) : (
        <p className="text-sm text-muted-foreground">
          The linked {target.type ? words(target.type) : "record"} could not be found; it may have
          been deleted.
        </p>
      )}
    </section>
  );
}
