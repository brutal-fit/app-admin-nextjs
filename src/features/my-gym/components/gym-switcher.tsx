import { FilterChips } from "@/components/data-table/filter-chips";
import type { ManagedGymSummary } from "@/lib/db/gyms-manager";

/**
 * For a manager of more than one gym: names the gym this page shows and switches with
 * `?gym=`, which the sidebar links then carry. Nothing for one gym.
 */
export function GymSwitcher({
  gyms,
  currentId,
  path,
}: {
  gyms: readonly ManagedGymSummary[];
  currentId: string;
  path: string;
}) {
  if (gyms.length < 2) return null;
  const current = gyms.find((gym) => gym.id === currentId);
  return (
    <div className="flex flex-col gap-2">
      {current ? (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{current.name}</span>
        </p>
      ) : null}
      <FilterChips
        label="Choose a gym"
        chips={gyms.map((gym) => ({
          id: gym.id,
          label: gym.name,
          active: gym.id === currentId,
          href: `${path}?gym=${encodeURIComponent(gym.id)}`,
        }))}
      />
    </div>
  );
}
