import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { GymSwitcher } from "@/features/my-gym/components/gym-switcher";
import { MyGymUnavailable } from "@/features/my-gym/components/my-gym-unavailable";
import { ReassignList } from "@/features/my-gym/components/reassign-list";
import { RequestList } from "@/features/my-gym/components/request-list";
import { loadRequestsPage, resolveMyGym } from "@/features/my-gym/api";
import { allotCandidates } from "@/features/my-gym/format";
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

export default async function MyGymRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoutePermission("/my-gym/requests");
  const context = await resolveMyGym((await searchParams).gym);
  if (context.status !== "ok") {
    return <MyGymUnavailable title="Requests" error={context.status === "error" ? context.message : null} />;
  }
  const supabase = await createSupabaseServerClient();
  const result = await loadRequestsPage(supabase, context.current.id, new Date(currentTime()).toISOString());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={context.current.name}
        title="Requests"
        description="Booking and reschedule requests for your gym, soonest first. Allot a trainer from your staff to confirm a request or decline it with a reason; accept a new time or keep the original."
      >
        <GymSwitcher gyms={context.gyms} currentId={context.current.id} path="/my-gym/requests" />
      </PageHeader>
      {result.ok ? (
        <>
          <Section id="gym-requests-waiting" title="Waiting for you">
            <RequestList requests={result.requests} options={allotCandidates(result.staff)} />
          </Section>
          <Section id="gym-requests-upcoming" title="Confirmed, not started">
            <p className="max-w-3xl text-sm text-muted-foreground">
              You can hand a confirmed session to another trainer until it starts.
            </p>
            <ReassignList bookings={result.upcoming} staffOptions={allotCandidates(result.staff)} />
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
