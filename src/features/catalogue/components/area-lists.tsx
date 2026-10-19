import { EmptyState } from "@/components/ui/empty-state";
import type { AreaGroup } from "@/features/catalogue/api";
import { CatalogueItemDialog } from "@/features/catalogue/components/catalogue-item-dialog";
import { CatalogueList } from "@/features/catalogue/components/catalogue-list";

/** The areas tab: one ordered list per city, each with its own "Add area". */
export function AreaLists({ groups }: { groups: readonly AreaGroup[] }) {
  const cities = groups.flatMap((group) =>
    group.city ? [{ key: group.city.key, label: group.city.label, active: group.city.active }] : [],
  );
  if (groups.length === 0) {
    return (
      <EmptyState
        title="No cities yet"
        description="Areas sit inside a city. Add a city on the Cities tab first."
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const headingId = `areas-${group.cityKey || "none"}`;
        return (
          <section key={headingId} aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id={headingId} className="font-semibold">
                {group.city
                  ? `${group.city.label}${group.city.active ? "" : " (inactive city)"}`
                  : `Unknown city "${group.cityKey}"`}
              </h3>
              {group.city ? (
                <CatalogueItemDialog
                  mode="create"
                  kind="area"
                  defaultParentKey={group.city.key}
                  cities={cities}
                />
              ) : null}
            </div>
            <CatalogueList kind="area" parentKey={group.cityKey} items={group.areas} cities={cities} />
          </section>
        );
      })}
    </div>
  );
}
