import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { GymSwitcher } from "@/features/my-gym/components/gym-switcher";
import { MyGymBookingList } from "@/features/my-gym/components/my-gym-booking-list";
import { MyGymUnavailable } from "@/features/my-gym/components/my-gym-unavailable";
import { loadBookingsPage, resolveMyGym } from "@/features/my-gym/api";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime } from "@/lib/utils/time";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function MyGymBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoutePermission("/my-gym/bookings");
  const context = await resolveMyGym((await searchParams).gym);
  if (context.status !== "ok") {
    return <MyGymUnavailable title="Bookings" error={context.status === "error" ? context.message : null} />;
  }
  const supabase = await createSupabaseServerClient();
  const result = await loadBookingsPage(supabase, context.current.id, new Date(currentTime()).toISOString());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={context.current.name}
        title="Bookings"
        description="Every booking at your gym: upcoming sessions soonest first, then past ones latest first."
      >
        <GymSwitcher gyms={context.gyms} currentId={context.current.id} path="/my-gym/bookings" />
      </PageHeader>
      {result.ok ? (
        <>
          <Section id="gym-bookings-upcoming" title="Upcoming">
            <MyGymBookingList
              bookings={result.upcoming}
              caption="Upcoming bookings"
              emptyText="Nothing booked from now on."
            />
          </Section>
          <Section id="gym-bookings-past" title="Past">
            <MyGymBookingList bookings={result.past} caption="Past bookings" emptyText="No past sessions yet." />
          </Section>
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
