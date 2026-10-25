import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { SubscriptionFilters } from "@/features/subscriptions/components/subscription-filters";
import { SubscriptionTable } from "@/features/subscriptions/components/subscription-table";
import { loadSubscriptionList } from "@/features/subscriptions/api";
import {
  SUBSCRIPTION_PAGE_SIZE,
  hasSubscriptionFilters,
  parseSubscriptionFilters,
  subscriptionListHref,
} from "@/features/subscriptions/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime, istDateString } from "@/lib/utils/time";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/subscriptions");
  const filters = parseSubscriptionFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadSubscriptionList(supabase, access, filters, istDateString(currentTime()));
  const trainerName = result.ok && filters.trainerId ? (result.names.trainers[filters.trainerId] ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Bookings"
        title="Subscriptions"
        description="Clients who subscribed to a trainer for 1, 4 or 12 weeks, newest first, with the period each is in now. Filters stay in the address."
      />
      <SubscriptionFilters filters={filters} trainerName={trainerName} />
      {result.ok ? (
        <>
          {result.names.clientNote ? (
            <p className="text-sm text-muted-foreground">{result.names.clientNote}</p>
          ) : null}
          <SubscriptionTable
            items={result.items}
            names={result.names}
            links={{ users: can(access.permissions, "users.read"), trainers: can(access.permissions, "trainers.read") }}
            filtered={hasSubscriptionFilters(filters) || filters.page > 1}
          />
          <PageLinks
            label="Subscription pages"
            noun="subscriptions"
            page={filters.page}
            pageSize={SUBSCRIPTION_PAGE_SIZE}
            shown={result.items.length}
            previousHref={filters.page > 1 ? subscriptionListHref(filters, { page: filters.page - 1 }) : null}
            nextHref={result.hasNext ? subscriptionListHref(filters, { page: filters.page + 1 }) : null}
          />
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
