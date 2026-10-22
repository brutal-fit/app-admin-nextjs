import { Home } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shown on a gym page when the session manages no gym right now (no active manager row, for
 * example an admin who holds the marker key) or the gym list could not be read.
 */
export function MyGymUnavailable({ title, error }: { title: string; error: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="My gym" title={title} />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <EmptyState
          icon={Home}
          title="No gym to manage"
          description="This account is not an active manager of any gym. A gym's manager invites you by your mobile number; BRUTAL invites the first manager when it creates the gym."
        />
      )}
    </div>
  );
}
