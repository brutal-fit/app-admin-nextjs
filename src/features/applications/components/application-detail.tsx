import type { ReactNode } from "react";
import type { Username } from "@/features/applications/api";
import { formatDateTime, formatInr, summariseAvailability } from "@/features/applications/format";
import { EXPERIENCE_LABELS, MODE_LABELS } from "@/features/applications/schemas";
import type { AvailabilityWindowRow, TrainerApplicationRow } from "@/types/database";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fields({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid max-w-3xl grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-line break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function list(values: readonly string[]): string {
  return values.length === 0 ? "None" : values.join(", ");
}

function text(value: string): ReactNode {
  return value.trim() === "" ? <span className="text-muted-foreground">Not given</span> : value;
}

/**
 * The applicant's answers, grouped as the app asks them. Expected rates are the trainer's
 * own; the platform price is set by ops in the decision form. Gated by applications.read.
 */
export function ApplicationDetail({
  application,
  username,
  availability,
  documents,
}: {
  application: TrainerApplicationRow;
  username: Username;
  availability: AvailabilityWindowRow[];
  /** The documents section body; the page picks it by permission. */
  documents: ReactNode;
}) {
  const offersHome = application.modes.includes("home");
  const offersOnline = application.modes.includes("online");
  const days = summariseAvailability(availability);

  return (
    <div className="flex flex-col gap-8">
      <Section id="application-profile" title="Profile">
        <Fields
          items={[
            ["Full name", text(application.full_name)],
            [
              "Username",
              username ? (
                `@${username}`
              ) : (
                <span className="text-muted-foreground">
                  {username === undefined ? "Hidden (needs View users)" : "None"}
                </span>
              ),
            ],
            ["Phone", text(application.phone)],
            ["City", text(application.city)],
            ["Areas covered", text(application.area)],
            [
              "Travel radius",
              application.travel_radius_km === null ? "Not given" : `${application.travel_radius_km} km`,
            ],
            ["Languages", list(application.languages)],
            ["Summary", text(application.summary)],
            ["Details confirmed accurate", application.accuracy_confirmed ? "Yes" : "No"],
            ["Submitted", formatDateTime(application.submitted_at)],
          ]}
        />
      </Section>

      <Section id="application-experience" title="Experience">
        <Fields
          items={[
            [
              "Experience",
              application.experience ? EXPERIENCE_LABELS[application.experience] : "Not given",
            ],
            ["Specialties", list(application.specialties)],
            ["Qualifications", text(application.qualifications)],
          ]}
        />
      </Section>

      <Section id="application-services" title="Services and expected rates">
        <Fields
          items={[
            ["Modes", list(application.modes.map((mode) => MODE_LABELS[mode]))],
            ...(offersHome
              ? ([["Home, expected by the trainer", formatInr(application.expected_home_rate_inr)]] as [
                  string,
                  ReactNode,
                ][])
              : []),
            ...(offersOnline
              ? ([
                  ["Online, expected by the trainer", formatInr(application.expected_online_rate_inr)],
                ] as [string, ReactNode][])
              : []),
            ["Session notes", text(application.session_notes)],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Expected rates are what the trainer asked for. The platform price clients pay is set in
          the decision below.
        </p>
      </Section>

      <Section id="application-availability" title="Availability">
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weekly hours saved.</p>
        ) : (
          <Fields items={days.map(({ day, ranges }) => [day, ranges])} />
        )}
      </Section>

      <Section id="application-documents" title="Documents">
        {documents}
      </Section>
    </div>
  );
}
