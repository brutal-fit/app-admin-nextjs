import { FilterChips } from "@/components/data-table/filter-chips";
import { PageHeader } from "@/components/layout/page-header";
import { loadCatalogue } from "@/features/catalogue/api";
import { AreaLists } from "@/features/catalogue/components/area-lists";
import { CatalogueItemDialog } from "@/features/catalogue/components/catalogue-item-dialog";
import { CatalogueList } from "@/features/catalogue/components/catalogue-list";
import {
  CATALOGUE_KINDS,
  CATALOGUE_KIND_HINTS,
  CATALOGUE_KIND_LABELS,
  catalogueHref,
  parseCatalogueKind,
} from "@/features/catalogue/schemas";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoutePermission("/catalogue");
  const kind = parseCatalogueKind((await searchParams).kind);
  const supabase = await createSupabaseServerClient();
  const result = await loadCatalogue(supabase);
  const labels = CATALOGUE_KIND_LABELS[kind];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Catalogue"
        description="The lists the app offers. Active items show in the app in this order; inactive ones stay for the records that use them."
      />
      <FilterChips
        label="Catalogue lists"
        chips={CATALOGUE_KINDS.map((value) => ({
          id: value,
          label: result.ok
            ? `${CATALOGUE_KIND_LABELS[value].plural} (${result.byKind[value].length})`
            : CATALOGUE_KIND_LABELS[value].plural,
          active: value === kind,
          href: catalogueHref(value),
        }))}
      />
      {!result.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      ) : (
        <section aria-labelledby="catalogue-list" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="catalogue-list" className="text-lg font-semibold">
                {labels.plural}
              </h2>
              <p className="max-w-3xl text-sm text-muted-foreground">{CATALOGUE_KIND_HINTS[kind]}</p>
            </div>
            {kind !== "area" ? <CatalogueItemDialog mode="create" kind={kind} cities={[]} /> : null}
          </div>
          {kind === "area" ? (
            <AreaLists groups={result.areaGroups} />
          ) : (
            <CatalogueList kind={kind} parentKey={null} items={result.byKind[kind]} cities={[]} />
          )}
        </section>
      )}
    </div>
  );
}
