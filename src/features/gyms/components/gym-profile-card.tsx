import type { ReactNode } from "react";
import { describePhone } from "@/features/users/format";
import type { Gym } from "@/lib/db/gyms-manager";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** The gym's public profile as stored: what clients see once it is listed. */
export function GymProfileCard({ gym }: { gym: Gym }) {
  return (
    <dl className="flex flex-col gap-3 rounded-xl border bg-card p-5 text-sm shadow-tile">
      <Row label="Tagline">{gym.tagline || <span className="text-muted-foreground">None</span>}</Row>
      <Row label="Address">{gym.address_text}</Row>
      <Row label="Area">
        {gym.area}, {gym.city}
      </Row>
      <Row label="Map pin">
        {gym.lat !== null && gym.lng !== null ? (
          `${gym.lat.toFixed(5)}, ${gym.lng.toFixed(5)}`
        ) : (
          <span className="text-muted-foreground">Not pinned yet</span>
        )}
      </Row>
      <Row label="Phone">
        {gym.phone ? describePhone(gym.phone).text : <span className="text-muted-foreground">None</span>}
      </Row>
      <Row label="Facilities">
        {gym.facilities.length > 0 ? (
          gym.facilities.join(", ")
        ) : (
          <span className="text-muted-foreground">None listed</span>
        )}
      </Row>
      <Row label="Description">
        {gym.description ? (
          <span className="whitespace-pre-line">{gym.description}</span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </Row>
    </dl>
  );
}
