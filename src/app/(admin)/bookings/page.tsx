import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { BookingFilters } from "@/features/bookings/components/booking-filters";
import { BookingTable } from "@/features/bookings/components/booking-table";
import { loadBookingList } from "@/features/bookings/api";
import {
  BOOKING_PAGE_SIZE,
  bookingListHref,
  hasBookingFilters,
  parseBookingFilters,
} from "@/features/bookings/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { istDateString } from "@/lib/utils/time";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/bookings");
  const filters = parseBookingFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadBookingList(supabase, access, filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Bookings"
        title="Bookings"
        description="Every booking on BRUTAL, newest session first. Filters stay in the address, so a filtered list can be shared."
      />
      {/* Keyed on the URL so the date inputs start from the filters after navigation. */}
      <BookingFilters
        key={bookingListHref(filters, { page: filters.page })}
        filters={filters}
        today={istDateString()}
        trainerName={result.ok ? result.trainerName : null}
        clientName={result.ok ? result.clientName : null}
      />
      {result.ok ? (
        <>
          <BookingTable
            rows={result.rows}
            avatars={result.avatars}
            filtered={hasBookingFilters(filters) || filters.page > 1}
            usersVisible={can(access.permissions, "users.read")}
            trainersVisible={can(access.permissions, "applications.read")}
          />
          <PageLinks
            label="Booking pages"
            noun="bookings"
            page={filters.page}
            pageSize={BOOKING_PAGE_SIZE}
            shown={result.rows.length}
            previousHref={filters.page > 1 ? bookingListHref(filters, { page: filters.page - 1 }) : null}
            nextHref={result.hasNext ? bookingListHref(filters, { page: filters.page + 1 }) : null}
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
