/*
 * The catalogue data layer: the only file in src/ that spells catalogue_items and the
 * catalogue functions (20261019000600_adminops_catalogue_announcements.sql). Reads run with
 * the admin's session: every row with catalogue.manage, active rows for anyone else. Writes
 * go through admin_upsert_catalogue_item and admin_delete_catalogue_item (catalogue.manage,
 * audited). Every wrapper throws AppError.
 */
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { CatalogueItemRow, CatalogueKind } from "@/types/database";

const TABLE = { items: "catalogue_items" } as const;

const RPC = {
  active: "catalogue",
  upsert: "admin_upsert_catalogue_item",
  remove: "admin_delete_catalogue_item",
} as const;

/** Every item the session may read, by kind, then the order the app shows them in. */
export async function listCatalogueItems(
  client: AppSupabaseClient,
  kind?: CatalogueKind,
): Promise<CatalogueItemRow[]> {
  let query = client.from(TABLE.items).select("*");
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query
    .order("kind")
    .order("sort_order")
    .order("label")
    .order("key");
  if (error) throw toAppError(error);
  return data;
}

export async function getCatalogueItem(
  client: AppSupabaseClient,
  id: string,
): Promise<CatalogueItemRow | null> {
  const { data, error } = await client.from(TABLE.items).select("*").eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function findCatalogueItem(
  client: AppSupabaseClient,
  kind: CatalogueKind,
  key: string,
): Promise<CatalogueItemRow | null> {
  const { data, error } = await client
    .from(TABLE.items)
    .select("*")
    .eq("kind", kind)
    .eq("key", key)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

/** Active items of one kind, as the app reads them (catalogue(p_kind)). */
export async function listActiveCatalogue(
  client: AppSupabaseClient,
  kind: CatalogueKind,
): Promise<CatalogueItemRow[]> {
  const { data, error } = await client.rpc(RPC.active, { p_kind: kind });
  if (error) throw toAppError(error);
  return data;
}

export type CatalogueItemInput = {
  kind: CatalogueKind;
  key: string;
  label: string;
  parentKey: string | null;
  sortOrder: number;
  active: boolean;
};

/**
 * Inserts or updates on (kind, key). The function writes every field, so callers pass the
 * whole item, not only what changed.
 */
export async function upsertCatalogueItem(
  client: AppSupabaseClient,
  input: CatalogueItemInput,
): Promise<void> {
  const { error } = await client.rpc(RPC.upsert, {
    p_kind: input.kind,
    p_key: input.key,
    p_label: input.label,
    p_parent_key: input.parentKey,
    p_sort_order: input.sortOrder,
    p_active: input.active,
  });
  if (error) throw toAppError(error);
}

/** Deletes an unused item; BRVAL "This item is in use. Deactivate it instead." otherwise. */
export async function deleteCatalogueItem(client: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await client.rpc(RPC.remove, { p_id: id });
  if (error) throw toAppError(error);
}
