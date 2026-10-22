import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { GymBookingList } from "@/features/gyms/components/gym-booking-list";
import { GymHoursList } from "@/features/gyms/components/gym-hours-list";
import { GymListingToggle } from "@/features/gyms/components/gym-listing-toggle";
import { GymPhotoGrid } from "@/features/gyms/components/gym-photo-grid";
import { GymProfileCard } from "@/features/gyms/components/gym-profile-card";
import { GymServicePriceDialog } from "@/features/gyms/components/gym-service-price-dialog";
import { GymStaffTable } from "@/features/gyms/components/gym-staff-table";
import { GymStatusBadge } from "@/features/gyms/components/gym-status-badge";
import { GymVerifyDialog } from "@/features/gyms/components/gym-verify-dialog";
import { loadGymDetail } from "@/features/gyms/api";
import { GYM_STATUS_LABELS, gymStatusHint } from "@/features/gyms/format";
import { allowedDecisions } from "@/features/gyms/schemas";
import { formatRating } from "@/features/trainers/format";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/gyms", label: "Back to gyms" };
const MODE = { home: "At the gym", online: "Online" } as const;

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

export default async function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/gyms/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadGymDetail(supabase, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Gym" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { gym } = result;
  const canManage = can(access.permissions, "gyms.manage");
  const decisions = allowedDecisions(gym.status);
  const pendingPrices = gym.services.filter((s) => s.active && s.price_inr === null).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Gym"
        title={gym.name}
        back={BACK}
        status={
          <StatusPulse value={gym.status}>
            <GymStatusBadge status={gym.status} />
          </StatusPulse>
        }
        description={
          <p>
            {gym.area}, {gym.city}. {formatRating(gym.rating, gym.review_count)}. {gym.bookings_count}{" "}
            {gym.bookings_count === 1 ? "booking" : "bookings"}.
          </p>
        }
      />

      <Section id="gym-review" title="Verification and listing">
        <div className="flex max-w-3xl flex-col gap-2 text-sm">
          <p className="text-muted-foreground">{gymStatusHint(gym.status)}</p>
          {gym.submitted_at ? <p>Sent for review {formatDateTime(gym.submitted_at)}.</p> : null}
          {gym.verified_at ? (
            <p>
              Verified {formatDateTime(gym.verified_at)}
              {gym.verified_by_name ? ` by ${gym.verified_by_name}` : ""}.
            </p>
          ) : null}
          {gym.review_note ? (
            <p>
              <span className="font-medium">Last note to the gym: </span>
              {gym.review_note}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {decisions.map((decision) => (
              <GymVerifyDialog key={decision} gymId={gym.id} gymName={gym.name} decision={decision} />
            ))}
            {gym.status === "verified" || gym.status === "listed" ? (
              <GymListingToggle
                key={gym.status}
                gymId={gym.id}
                gymName={gym.name}
                listed={gym.status === "listed"}
              />
            ) : null}
            {decisions.length === 0 && gym.status === "draft" ? (
              <p className="text-sm text-muted-foreground">
                Nothing to decide yet: the gym is a {GYM_STATUS_LABELS.draft.toLowerCase()} until its
                manager sends it for review.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("gyms.manage", "Verifying and listing")}
          </p>
        )}
      </Section>

      <Section id="gym-profile" title="Profile">
        <GymProfileCard gym={gym} />
        <GymPhotoGrid photos={gym.photos} gymName={gym.name} />
      </Section>

      <Section id="gym-services" title="Services and prices">
        <p className="max-w-3xl text-sm text-muted-foreground">
          The gym sets its ask; BRUTAL sets the platform price clients pay. Only an active service
          with a platform price is bookable.
          {pendingPrices > 0 ? ` ${pendingPrices} waiting for a price.` : ""}
        </p>
        {gym.services.length === 0 ? (
          <p className="text-sm text-muted-foreground">The gym has no services yet.</p>
        ) : (
          <ul className="flex max-w-4xl flex-col divide-y rounded-lg border bg-card text-sm shadow-tile">
            {gym.services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">
                    {service.title}
                    {!service.active ? <span className="text-muted-foreground"> (inactive)</span> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {MODE[service.mode]}, {service.duration_minutes} min. Gym asks {formatInr(service.submitted_price_inr)}.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {service.price_inr === null ? (
                    <Badge variant="outline" className="border-warning text-warning">
                      Price pending
                    </Badge>
                  ) : (
                    <span className="tabular-nums">Platform {formatInr(service.price_inr)}</span>
                  )}
                  {canManage ? (
                    <GymServicePriceDialog
                      serviceId={service.id}
                      serviceTitle={service.title}
                      askInr={service.submitted_price_inr}
                      priceInr={service.price_inr}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!canManage ? (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("gyms.manage", "Setting platform prices")}
          </p>
        ) : null}
      </Section>

      <Section id="gym-hours" title="Opening hours">
        <GymHoursList hours={gym.hours} />
      </Section>

      <Section id="gym-staff" title="Staff">
        <GymStaffTable staff={gym.staff} permissions={access.permissions} />
      </Section>

      <Section id="gym-bookings" title="Bookings">
        <GymBookingList bookings={gym.bookings} total={gym.bookings_count} permissions={access.permissions} />
      </Section>

      <Section id="gym-reviews" title="Reviews">
        {gym.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="flex max-w-3xl flex-col gap-3">
            {gym.reviews.map((review) => (
              <li key={review.booking_id} className="rounded-lg border bg-card p-4 text-sm shadow-tile">
                <p className="font-medium">
                  {review.rating} of 5, by {review.author_display_name}
                  <span className="font-normal text-muted-foreground"> on {formatDateTime(review.created_at)}</span>
                </p>
                {review.body ? <p className="mt-1 whitespace-pre-line">{review.body}</p> : null}
              </li>
            ))}
          </ul>
        )}
        {gym.review_count > gym.reviews.length ? (
          <p className="text-xs text-muted-foreground">
            Showing the latest {gym.reviews.length} of {gym.review_count} reviews.
          </p>
        ) : null}
      </Section>
    </div>
  );
}
