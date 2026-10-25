import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { CancelSubscriptionDialog } from "@/features/subscriptions/components/cancel-subscription-dialog";
import { SubscriptionDetail } from "@/features/subscriptions/components/subscription-detail";
import { SubscriptionStatusBadge } from "@/features/subscriptions/components/subscription-status-badge";
import { loadSubscriptionDetail } from "@/features/subscriptions/api";
import { subscriptionStatusTone } from "@/features/subscriptions/format";
import { SUBSCRIPTION_STATUS_LABELS, isSubscriptionCancellable } from "@/features/subscriptions/schemas";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/subscriptions", label: "Back to subscriptions" };

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/subscriptions/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadSubscriptionDetail(supabase, access, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Subscription" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { subscription, names } = result;
  const clientName = names.clients[subscription.client_id];
  const trainerName = names.trainers[subscription.trainer_id];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Subscription"
        title={clientName && trainerName ? `${clientName} with ${trainerName}` : "Subscription"}
        back={BACK}
        status={
          // Pulses once when a cancel comes back from the server with a new status.
          <StatusPulse value={subscription.status} className={subscriptionStatusTone(subscription.status)}>
            <SubscriptionStatusBadge status={subscription.status} />
          </StatusPulse>
        }
      />

      <SubscriptionDetail
        subscription={subscription}
        slots={result.slots}
        periods={result.periods}
        sessions={result.sessions}
        names={names}
        permissions={access.permissions}
      />

      <section aria-labelledby="subscription-actions" className="flex flex-col gap-3">
        <h2 id="subscription-actions" className="text-lg font-semibold">
          Actions
        </h2>
        {!can(access.permissions, "bookings.cancel") ? (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("bookings.cancel", "Cancelling a subscription")}
          </p>
        ) : isSubscriptionCancellable(subscription.status) ? (
          <CancelSubscriptionDialog subscriptionId={subscription.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            A subscription that is {SUBSCRIPTION_STATUS_LABELS[subscription.status].toLowerCase()} cannot be cancelled.
          </p>
        )}
      </section>
    </div>
  );
}
