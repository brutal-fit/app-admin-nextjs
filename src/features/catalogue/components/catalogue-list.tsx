"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  reorderCatalogueAction,
  setCatalogueItemActiveAction,
} from "@/features/catalogue/actions";
import {
  CatalogueItemDialog,
  type CityOption,
} from "@/features/catalogue/components/catalogue-item-dialog";
import { DeleteCatalogueItemDialog } from "@/features/catalogue/components/delete-catalogue-item-dialog";
import { CATALOGUE_KIND_LABELS, moveItem } from "@/features/catalogue/schemas";
import { showToast } from "@/stores/toast-store";
import type { CatalogueItemRow, CatalogueKind } from "@/types/database";

/**
 * One catalogue list (or the areas of one city) in the order the app shows it. Up and down
 * write sort_order for the whole list through the server; the rows move only once the page
 * re-reads the catalogue. Edit, activate or deactivate, and delete per row. Gated by
 * catalogue.manage.
 */
export function CatalogueList({
  kind,
  parentKey,
  items,
  cities,
}: {
  kind: CatalogueKind;
  /** The city key when this list is the areas of one city. */
  parentKey: string | null;
  items: readonly CatalogueItemRow[];
  cities: readonly CityOption[];
}) {
  const [pending, startTransition] = useTransition();
  const plural = CATALOGUE_KIND_LABELS[kind].plural.toLowerCase();

  function move(index: number, direction: "up" | "down") {
    const orderedIds = moveItem(items, index, direction).map((item) => item.id);
    startTransition(async () => {
      const result = await reorderCatalogueAction({ kind, parentKey, orderedIds });
      if (!result.ok) showToast("error", result.error.message);
    });
  }

  function setActive(item: CatalogueItemRow, active: boolean) {
    startTransition(async () => {
      const result = await setCatalogueItemActiveAction({ id: item.id, active });
      if (!result.ok) {
        showToast("error", result.error.message);
        return;
      }
      showToast("success", active ? `${item.label} is active.` : `${item.label} is inactive.`);
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={`No ${plural} yet`}
        description="Add one; the app keeps using its built-in list until the catalogue has items."
      />
    );
  }

  return (
    <ol
      aria-label={CATALOGUE_KIND_LABELS[kind].plural}
      aria-busy={pending}
      className="flex max-w-4xl flex-col divide-y rounded-lg border bg-card shadow-tile"
    >
      {items.map((item, index) => (
        <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Move ${item.label} up`}
              disabled={pending || index === 0}
              onClick={() => move(index, "up")}
            >
              <ArrowUp size={16} aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Move ${item.label} down`}
              disabled={pending || index === items.length - 1}
              onClick={() => move(index, "down")}
            >
              <ArrowDown size={16} aria-hidden="true" />
            </Button>
          </div>
          <div className="flex min-w-40 flex-1 flex-col">
            <span className={item.active ? "font-medium" : "font-medium text-muted-foreground"}>
              {item.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
          </div>
          {item.active ? null : (
            <Badge variant="outline" className="text-muted-foreground">
              Inactive
            </Badge>
          )}
          <div className="flex flex-wrap items-center gap-1">
            <CatalogueItemDialog mode="edit" kind={kind} item={item} cities={cities} />
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setActive(item, !item.active)}
            >
              {item.active ? "Deactivate" : "Activate"}
            </Button>
            <DeleteCatalogueItemDialog item={item} />
          </div>
        </li>
      ))}
    </ol>
  );
}
