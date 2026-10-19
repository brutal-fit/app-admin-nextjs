/*
 * Server-side loader for the catalogue page (catalogue.manage, which also lets the session
 * read inactive rows).
 */
import { listCatalogueItems } from "@/lib/db/catalogue";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { CatalogueItemRow, CatalogueKind } from "@/types/database";
import { CATALOGUE_KINDS } from "@/features/catalogue/schemas";

export type AreaGroup = {
  cityKey: string;
  /** Null when the area names a city key that is not in the catalogue. */
  city: CatalogueItemRow | null;
  areas: CatalogueItemRow[];
};

export type CatalogueResult =
  | {
      ok: true;
      byKind: Record<CatalogueKind, CatalogueItemRow[]>;
      areaGroups: AreaGroup[];
    }
  | { ok: false; error: string };

/** Areas under their city, cities in catalogue order, unknown parents last. */
export function groupAreas(
  cities: readonly CatalogueItemRow[],
  areas: readonly CatalogueItemRow[],
): AreaGroup[] {
  const groups: AreaGroup[] = cities.map((city) => ({
    cityKey: city.key,
    city,
    areas: areas.filter((area) => area.parent_key === city.key),
  }));
  const known = new Set(cities.map((city) => city.key));
  for (const area of areas) {
    const key = area.parent_key ?? "";
    if (known.has(key)) continue;
    let group = groups.find((entry) => entry.city === null && entry.cityKey === key);
    if (!group) {
      group = { cityKey: key, city: null, areas: [] };
      groups.push(group);
    }
    group.areas.push(area);
  }
  return groups;
}

export async function loadCatalogue(client: AppSupabaseClient): Promise<CatalogueResult> {
  try {
    const items = await listCatalogueItems(client);
    const byKind = Object.fromEntries(
      CATALOGUE_KINDS.map((kind) => [kind, items.filter((item) => item.kind === kind)]),
    ) as Record<CatalogueKind, CatalogueItemRow[]>;
    return { ok: true, byKind, areaGroups: groupAreas(byKind.city, byKind.area) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}
