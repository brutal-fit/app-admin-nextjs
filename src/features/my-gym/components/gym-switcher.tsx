import { FilterChips } from "@/components/data-table/filter-chips";
import type { ManagedGymSummary } from "@/lib/db/gyms";

/** For a manager of more than one gym: which gym this page shows. Nothing for one gym. */
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
  return (
    <FilterChips
      label="Choose a gym"
      chips={gyms.map((gym) => ({
        id: gym.id,
        label: gym.name,
        active: gym.id === currentId,
        href: `${path}?gym=${encodeURIComponent(gym.id)}`,
      }))}
    />
  );
}
