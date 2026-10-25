import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { DocumentList } from "@/features/applications/components/document-list";
import { formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { permittedHref } from "@/features/support/format";
import { CustomPlanList } from "@/features/coaching/components/custom-plan-list";
import { loadCustomPlans } from "@/features/coaching/api";
import { ListingToggle } from "@/features/trainers/components/listing-toggle";
import { OffersCoachingToggle } from "@/features/trainers/components/offers-coaching-toggle";
import { RequestDocumentsDialog } from "@/features/trainers/components/request-documents-dialog";
import { ServicesEditor } from "@/features/trainers/components/services-editor";
import { TrainerProfileForm } from "@/features/trainers/components/trainer-profile-form";
import { TrainerSummary } from "@/features/trainers/components/trainer-summary";
import { loadTrainerDetail } from "@/features/trainers/api";
import { formatRating, listedLabel, listedTone } from "@/features/trainers/format";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ServiceRow } from "@/types/database";

const BACK = { href: "/trainers", label: "Back to trainers" };

// The editor restarts from the server's list whenever any saved value changes.
function servicesKey(services: readonly ServiceRow[]): string {
  return services
    .map((s) => [s.id, s.title, s.mode, s.duration_minutes, s.price_inr, s.active].join(":"))
    .join("|");
}

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

function HeaderLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
    >
      {label}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

export default async function TrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/trainers/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadTrainerDetail(supabase, access, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Trainer" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { profile, services, rating, application, documents, specialtyOptions, languageOptions } = result;
  const customPlans = await loadCustomPlans(supabase, access, { trainerId: profile.trainer_id });
  const name = profile.display_name || application?.fullName || "Unnamed";
  const canEdit = can(access.permissions, "trainers.edit");
  const canReviewDocuments = can(access.permissions, "documents.review");
  const listBlocked =
    application?.status === "approved"
      ? null
      : "Listing needs an approved application; this one is not approved.";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Trainer"
        title={name}
        back={BACK}
        status={
          <StatusPulse value={listedLabel(profile.published)} className={listedTone(profile.published)}>
            <Badge variant="outline" className={listedTone(profile.published)}>
              {listedLabel(profile.published)}
            </Badge>
          </StatusPulse>
        }
        description={
          <p>
            {[application?.city, formatRating(rating?.average_rating ?? null, rating?.review_count ?? 0)]
              .filter(Boolean)
              .join(". ")}
            .
            {application?.reviewerNote ? (
              <>
                {" "}
                <span className="font-medium text-foreground">Last note to the trainer: </span>
                {application.reviewerNote}
              </>
            ) : null}
          </p>
        }
        actions={
          <>
            <HeaderLink
              href={permittedHref(access.permissions, `/applications/${profile.trainer_id}`)}
              label="Application"
            />
            <HeaderLink
              href={permittedHref(
                access.permissions,
                `/bookings?trainer=${encodeURIComponent(profile.trainer_id)}`,
              )}
              label="Bookings"
            />
            <HeaderLink
              href={permittedHref(
                access.permissions,
                `/subscriptions?trainer=${encodeURIComponent(profile.trainer_id)}`,
              )}
              label="Subscriptions"
            />
            <HeaderLink
              href={permittedHref(access.permissions, `/coaching?coach=${encodeURIComponent(profile.trainer_id)}`)}
              label="Coaching"
            />
            <HeaderLink
              href={permittedHref(
                access.permissions,
                `/reviews?trainer=${encodeURIComponent(profile.trainer_id)}`,
              )}
              label="Reviews"
            />
            <HeaderLink
              href={permittedHref(access.permissions, `/users/${profile.trainer_id}`)}
              label="User"
            />
          </>
        }
      />

      <Section id="trainer-listing" title="Listing">
        <p className="max-w-3xl text-sm text-muted-foreground">
          {profile.published
            ? "Clients can find this trainer and send booking requests."
            : "Clients cannot find this trainer or send booking requests."}
        </p>
        {canEdit ? (
          <ListingToggle
            key={String(profile.published)}
            trainerId={profile.trainer_id}
            trainerName={name}
            listed={profile.published}
            blockedReason={listBlocked}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("trainers.edit", "Listing and unlisting")}
          </p>
        )}
      </Section>

      <Section id="trainer-coaching" title="Coaching">
        {canEdit ? (
          // Keyed on the stored value so the switch restarts from the server after a save.
          <OffersCoachingToggle
            key={String(profile.offers_coaching)}
            trainerId={profile.trainer_id}
            trainerName={name}
            offersCoaching={profile.offers_coaching}
          />
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-sm">{profile.offers_coaching ? "Offers coaching." : "Does not offer coaching."}</p>
            <p className="text-sm text-muted-foreground">
              {missingPermissionMessage("trainers.edit", "Changing whether this trainer coaches")}
            </p>
          </div>
        )}
      </Section>

      <Section id="trainer-profile" title="Profile">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 shadow-tile">
            <TrainerSummary profile={profile} application={application} rating={rating} />
          </div>
          {canEdit ? (
            // Keyed on updated_at so the form starts from what the server stored after a save.
            <TrainerProfileForm
              key={profile.updated_at}
              trainerId={profile.trainer_id}
              initial={{
                headline: profile.headline,
                bio: profile.bio,
                years_experience: profile.years_experience,
                specialties: profile.specialties,
                languages: profile.languages,
                service_area: profile.service_area,
              }}
              specialtyOptions={specialtyOptions}
              languageOptions={languageOptions}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {missingPermissionMessage("trainers.edit", "Editing the profile")}
            </p>
          )}
        </div>
      </Section>

      <Section id="trainer-services" title="Services and prices">
        {canEdit ? (
          <ServicesEditor
            key={servicesKey(services)}
            trainerId={profile.trainer_id}
            services={services}
            approvedHomeRateInr={profile.approved_home_rate_inr}
            approvedOnlineRateInr={profile.approved_online_rate_inr}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">This trainer has no services yet.</p>
            ) : (
              <ul className="flex max-w-3xl flex-col divide-y rounded-lg border bg-card text-sm shadow-tile">
                {services.map((service) => (
                  <li key={service.id} className="flex flex-wrap justify-between gap-3 px-4 py-3">
                    <span className="font-medium">{service.title}</span>
                    <span className="text-muted-foreground">
                      {MODE_LABELS[service.mode]}, {service.duration_minutes} min,{" "}
                      {formatInr(service.price_inr)}
                      {service.active ? "" : ", inactive"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              {missingPermissionMessage("trainers.edit", "Changing services and prices")}
            </p>
          </div>
        )}
      </Section>

      <Section id="trainer-plans" title="Plans">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Custom plans this trainer built for clients with a subscription or a coaching. Read only.
        </p>
        <CustomPlanList state={customPlans} side="trainer" permissions={access.permissions} />
      </Section>

      <Section id="trainer-documents" title="Documents">
        {canReviewDocuments && documents !== null ? (
          <>
            <div>
              <RequestDocumentsDialog trainerId={profile.trainer_id} trainerName={name} />
            </div>
            <DocumentList documents={documents} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("documents.review", "Documents")}
          </p>
        )}
      </Section>
    </div>
  );
}
