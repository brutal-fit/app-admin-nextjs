import type { ReactNode } from "react";
import { formatDateTime } from "@/features/applications/format";
import { APPLICATION_STATUS_LABELS, MODE_LABELS } from "@/features/applications/schemas";
import type { TrainerApplicationSummary } from "@/features/trainers/api";
import { formatRating, joinList } from "@/features/trainers/format";
import type { TrainerProfileRow, TrainerRatingSummaryRow } from "@/types/database";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

const NONE = "Not set";

/**
 * The profile as clients see it, plus where the application stands. Read-only; shown to
 * every session that may open the page (trainers.read). The editable form sits beside
 * it for trainers.edit.
 */
export function TrainerSummary({
  profile,
  application,
  rating,
}: {
  profile: TrainerProfileRow;
  application: TrainerApplicationSummary | null;
  rating: TrainerRatingSummaryRow | null;
}) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      <Row label="Application">
        {application ? APPLICATION_STATUS_LABELS[application.status] : "No application on record"}
      </Row>
      <Row label="City">{application?.city || NONE}</Row>
      <Row label="Rating">{formatRating(rating?.average_rating ?? null, rating?.review_count ?? 0)}</Row>
      <Row label="Modes">
        {profile.modes.length > 0 ? profile.modes.map((mode) => MODE_LABELS[mode]).join(", ") : NONE}
      </Row>
      <Row label="Headline">{profile.headline || NONE}</Row>
      <Row label="Bio">{profile.bio || NONE}</Row>
      <Row label="Years">{profile.years_experience}</Row>
      <Row label="Specialties">{joinList(profile.specialties) || NONE}</Row>
      <Row label="Languages">{joinList(profile.languages) || NONE}</Row>
      <Row label="Service area">{profile.service_area || NONE}</Row>
      <Row label="Verified">{joinList(profile.verified_checks) || "None"}</Row>
      <Row label="Prices acknowledged">
        {profile.pricing_acknowledged_at ? formatDateTime(profile.pricing_acknowledged_at) : "Not yet"}
      </Row>
    </dl>
  );
}
