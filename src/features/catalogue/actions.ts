"use server";

import { refresh } from "next/cache";
import {
  deleteCatalogueItem,
  findCatalogueItem,
  getCatalogueItem,
  listCatalogueItems,
  upsertCatalogueItem,
} from "@/lib/db/catalogue";
import { AppError } from "@/lib/supabase/errors";
import { runAction } from "@/server/run-action";
import {
  CATALOGUE_KIND_LABELS,
  deleteCatalogueItemSchema,
  nextSortOrder,
  reorderCatalogueSchema,
  saveCatalogueItemSchema,
  setCatalogueItemActiveSchema,
  sortOrdersFor,
} from "@/features/catalogue/schemas";
import type { ActionResult } from "@/types/action-result";

// Every write goes through admin_upsert_catalogue_item or admin_delete_catalogue_item, then
// refresh() re-renders the page so it reads the catalogue again. The upsert writes every
// field, so each action starts from the row as the server holds it now.

export async function saveCatalogueItemAction(input: unknown): Promise<ActionResult> {
  return runAction(saveCatalogueItemSchema, input, "catalogue.manage", async (data, { supabase }) => {
    const existing = await findCatalogueItem(supabase, data.kind, data.key);
    const singular = CATALOGUE_KIND_LABELS[data.kind].singular;
    if (data.mode === "create" && existing) {
      // The upsert would silently overwrite it; a new item must not.
      throw new AppError("BRVAL", `There is already a ${singular} with the key "${data.key}". Edit that one instead.`);
    }
    if (data.mode === "edit" && !existing) {
      throw new AppError("BRNTF", `This ${singular} no longer exists.`);
    }
    let sortOrder = existing?.sort_order;
    if (sortOrder === undefined) {
      const siblings = (await listCatalogueItems(supabase, data.kind)).filter(
        (item) => data.kind !== "area" || item.parent_key === data.parentKey,
      );
      sortOrder = nextSortOrder(siblings.map((item) => item.sort_order));
    }
    await upsertCatalogueItem(supabase, {
      kind: data.kind,
      key: data.key,
      label: data.label,
      parentKey: data.parentKey,
      sortOrder,
      active: data.active,
    });
    refresh();
    return undefined;
  });
}

export async function setCatalogueItemActiveAction(input: unknown): Promise<ActionResult> {
  return runAction(setCatalogueItemActiveSchema, input, "catalogue.manage", async (data, { supabase }) => {
    const item = await getCatalogueItem(supabase, data.id);
    if (!item) throw new AppError("BRNTF", "This item no longer exists.");
    await upsertCatalogueItem(supabase, {
      kind: item.kind,
      key: item.key,
      label: item.label,
      parentKey: item.parent_key,
      sortOrder: item.sort_order,
      active: data.active,
    });
    refresh();
    return undefined;
  });
}

export async function deleteCatalogueItemAction(input: unknown): Promise<ActionResult> {
  return runAction(deleteCatalogueItemSchema, input, "catalogue.manage", async (data, { supabase }) => {
    await deleteCatalogueItem(supabase, data.id);
    refresh();
    return undefined;
  });
}

/**
 * Writes sort_order for one list (or the areas of one city) in the order given. The ids must
 * be exactly the list as the server holds it, so a stale page cannot drop or revive items.
 * Only items whose position changed are written; each write is audited on its own.
 */
export async function reorderCatalogueAction(input: unknown): Promise<ActionResult> {
  return runAction(reorderCatalogueSchema, input, "catalogue.manage", async (data, { supabase }) => {
    const group = (await listCatalogueItems(supabase, data.kind)).filter(
      (item) => data.kind !== "area" || item.parent_key === data.parentKey,
    );
    const byId = new Map(group.map((item) => [item.id, item]));
    if (group.length !== data.orderedIds.length || !data.orderedIds.every((id) => byId.has(id))) {
      throw new AppError("BRVAL", "The list changed since the page loaded. Reload and try again.");
    }
    const orders = sortOrdersFor(data.orderedIds.length);
    if (!orders) throw new AppError("BRVAL", "This list is too long to reorder here.");
    for (const [index, id] of data.orderedIds.entries()) {
      const item = byId.get(id);
      const sortOrder = orders[index];
      if (!item || sortOrder === undefined || item.sort_order === sortOrder) continue;
      await upsertCatalogueItem(supabase, {
        kind: item.kind,
        key: item.key,
        label: item.label,
        parentKey: item.parent_key,
        sortOrder,
        active: item.active,
      });
    }
    refresh();
    return undefined;
  });
}
