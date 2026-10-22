import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { GymStatusBadge } from "@/features/gyms/components/gym-status-badge";
import { gymStatusHint } from "@/features/gyms/format";
import { formatRating } from "@/features/trainers/format";
import { GymSwitcher } from "@/features/my-gym/components/gym-switcher";
import { MyGymHoursEditor } from "@/features/my-gym/components/my-gym-hours-editor";
import { MyGymPhotos } from "@/features/my-gym/components/my-gym-photos";
import { MyGymProfileForm } from "@/features/my-gym/components/my-gym-profile-form";
import { MyGymServicesEditor } from "@/features/my-gym/components/my-gym-services-editor";
import { MyGymUnavailable } from "@/features/my-gym/components/my-gym-unavailable";
import { SubmitGymButton } from "@/features/my-gym/components/submit-gym-button";
import { loadMyGym, resolveMyGym } from "@/features/my-gym/api";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function MyGymPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoutePermission("/my-gym");
  const context = await resolveMyGym((await searchParams).gym);
  if (context.status !== "ok") {
    return <MyGymUnavailable title="My gym" error={context.status === "error" ? context.message : null} />;
  }
  const supabase = await createSupabaseServerClient();
  const result = await loadMyGym(supabase, context.current.id);
  if (!result.ok) return <MyGymUnavailable title={context.current.name} error={result.error} />;
  const { gym } = result;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="My gym"
        title={gym.name}
        status={
          <StatusPulse value={gym.status}>
            <GymStatusBadge status={gym.status} />
          </StatusPulse>
        }
        description={
          <p>
            {gym.area}, {gym.city}. {formatRating(gym.rating, gym.review_count)}.
          </p>
        }
      >
        <GymSwitcher gyms={context.gyms} currentId={gym.id} path="/my-gym" />
      </PageHeader>

      <Section id="my-gym-status" title="Status">
        <p className="max-w-3xl text-sm text-muted-foreground">{gymStatusHint(gym.status)}</p>
        {gym.review_note ? (
          <p className="max-w-3xl text-sm">
            <span className="font-medium">Note from BRUTAL: </span>
            {gym.review_note}
          </p>
        ) : null}
        {gym.status === "draft" ? <SubmitGymButton gymId={gym.id} /> : null}
      </Section>

      <Section id="my-gym-profile" title="Profile">
        <MyGymProfileForm key={gym.updated_at} gym={gym} />
      </Section>

      <Section id="my-gym-photos" title="Photos">
        <MyGymPhotos gymId={gym.id} gymName={gym.name} photos={gym.photos} />
      </Section>

      <Section id="my-gym-services" title="Services and prices">
        <MyGymServicesEditor gymId={gym.id} services={gym.services} />
      </Section>

      <Section id="my-gym-hours" title="Opening hours">
        <MyGymHoursEditor
          key={gym.hours.map((w) => `${w.weekday}:${w.start_minute}:${w.end_minute}`).join("|")}
          gymId={gym.id}
          hours={gym.hours}
        />
      </Section>
    </div>
  );
}
