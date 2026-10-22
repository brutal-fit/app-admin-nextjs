import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentFilters } from "@/features/payments/components/payment-filters";
import { PaymentTable } from "@/features/payments/components/payment-table";
import { loadPaymentList } from "@/features/payments/api";
import {
  PAYMENT_PAGE_SIZE,
  hasPaymentFilters,
  parsePaymentFilters,
  paymentListHref,
} from "@/features/payments/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime } from "@/lib/utils/time";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/payments");
  const filters = parsePaymentFilters(await searchParams);
  const now = currentTime();
  const supabase = await createSupabaseServerClient();
  const result = await loadPaymentList(supabase, access, filters, now);
  const permissions = access.permissions;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Bookings"
        title="Payments"
        description="Every Razorpay order and refund, newest first. Filters stay in the address, so a filtered list can be shared."
      />
      {/* Keyed on the URL so the inputs start from the filters after navigation. */}
      <PaymentFilters key={paymentListHref(filters, { page: filters.page })} filters={filters} range={result.range} />
      {result.ok ? (
        <>
          {result.bookings.kind !== "ok" ? (
            <p role={result.bookings.kind === "error" ? "alert" : undefined} className="text-sm text-muted-foreground">
              {result.bookings.reason}
            </p>
          ) : null}
          <PaymentTable
            rows={result.rows}
            bookings={
              result.bookings.kind === "ok" ? { visible: true, bookings: result.bookings.bookings } : { visible: false }
            }
            links={{
              bookings: can(permissions, "bookings.read"),
              users: can(permissions, "users.read"),
              trainers: can(permissions, "trainers.read"),
              gyms: can(permissions, "gyms.read"),
            }}
            now={now}
            filtered={hasPaymentFilters(filters) || filters.page > 1}
          />
          <PageLinks
            label="Payment pages"
            noun="payments"
            page={filters.page}
            pageSize={PAYMENT_PAGE_SIZE}
            shown={result.rows.length}
            previousHref={filters.page > 1 ? paymentListHref(filters, { page: filters.page - 1 }) : null}
            nextHref={result.hasNext ? paymentListHref(filters, { page: filters.page + 1 }) : null}
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
