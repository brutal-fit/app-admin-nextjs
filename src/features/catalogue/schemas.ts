import { z } from "zod";
import type { CatalogueKind } from "@/types/database";

/** Tab order on the catalogue page; areas sit after cities because they hang off them. */
export const CATALOGUE_KINDS = [
  "specialty",
  "category",
  "goal",
  "city",
  "area",
  "language",
] as const satisfies readonly CatalogueKind[];

export const CATALOGUE_KIND_LABELS: Record<CatalogueKind, { plural: string; singular: string }> = {
  specialty: { plural: "Specialties", singular: "specialty" },
  category: { plural: "Categories", singular: "category" },
  goal: { plural: "Goals", singular: "goal" },
  city: { plural: "Cities", singular: "city" },
  area: { plural: "Areas", singular: "area" },
  language: { plural: "Languages", singular: "language" },
};

/** Where each list shows in the app, so the team knows what an edit touches. */
export const CATALOGUE_KIND_HINTS: Record<CatalogueKind, string> = {
  specialty: "What trainers say they teach: the application, the trainer profile and the listing.",
  category: "The categories clients browse in search.",
  goal: "The goals clients pick during onboarding.",
  city: "The cities BRUTAL serves. A city with areas cannot be deleted; deactivate it instead.",
  area: "Neighbourhoods inside each city, as trainer applications and client preferences name them.",
  language: "Languages trainers speak and clients prefer.",
};

// Same rules as admin_upsert_catalogue_item.
export const CATALOGUE_KEY_PATTERN = /^[a-z0-9][a-z0-9_]{0,59}$/;
export const CATALOGUE_KEY_MAX = 60;
export const CATALOGUE_LABEL_MAX = 80;
export const CATALOGUE_SORT_MAX = 10000;
/** Gap between neighbours after a reorder, so a later insert has room. */
export const CATALOGUE_SORT_STEP = 10;

export function isCatalogueKind(value: string): value is CatalogueKind {
  return (CATALOGUE_KINDS as readonly string[]).includes(value);
}

export function parseCatalogueKind(value: string | string[] | undefined): CatalogueKind {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && isCatalogueKind(raw) ? raw : "specialty";
}

export function catalogueHref(kind: CatalogueKind): string {
  return kind === "specialty" ? "/catalogue" : `/catalogue?kind=${kind}`;
}

/** A key suggestion from a label: lowercase words joined by underscores. */
export function suggestCatalogueKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, CATALOGUE_KEY_MAX)
    .replace(/_+$/, "");
}

/** The next sort order after the given items, capped at the server's maximum. */
export function nextSortOrder(sortOrders: readonly number[]): number {
  const highest = sortOrders.length === 0 ? 0 : Math.max(...sortOrders);
  return Math.min(highest + CATALOGUE_SORT_STEP, CATALOGUE_SORT_MAX);
}

/**
 * Sort orders for a list in its new order: CATALOGUE_SORT_STEP apart, or 1 apart when the
 * list is too long for that. Null when even that does not fit the server's range.
 */
export function sortOrdersFor(count: number): number[] | null {
  const step = count * CATALOGUE_SORT_STEP <= CATALOGUE_SORT_MAX ? CATALOGUE_SORT_STEP : 1;
  if (count * step > CATALOGUE_SORT_MAX) return null;
  return Array.from({ length: count }, (_, index) => (index + 1) * step);
}

/** Moves the item at `index` one place up or down; the same list when it cannot move. */
export function moveItem<T>(items: readonly T[], index: number, direction: "up" | "down"): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  if (moved !== undefined) next.splice(target, 0, moved);
  return next;
}

const kindSchema = z.enum(CATALOGUE_KINDS, { error: "Unknown catalogue list." });
const itemIdSchema = z.guid("Unknown catalogue item.");

export const saveCatalogueItemSchema = z
  .object({
    mode: z.enum(["create", "edit"]),
    kind: kindSchema,
    key: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        CATALOGUE_KEY_PATTERN,
        `Use 1 to ${CATALOGUE_KEY_MAX} lowercase letters, numbers or underscores for the key, starting with a letter or number.`,
      ),
    label: z
      .string()
      .trim()
      .min(1, "Give a label.")
      .max(CATALOGUE_LABEL_MAX, `Keep the label to ${CATALOGUE_LABEL_MAX} characters or fewer.`),
    parentKey: z.string().trim().toLowerCase().nullable(),
    active: z.boolean(),
  })
  .superRefine((item, context) => {
    if (item.kind === "area" && !item.parentKey) {
      context.addIssue({ code: "custom", path: ["parentKey"], message: "Choose the city this area is in." });
    }
    if (item.kind !== "area" && item.parentKey) {
      context.addIssue({ code: "custom", path: ["parentKey"], message: "Only an area has a city." });
    }
  });

export type SaveCatalogueItemInput = z.input<typeof saveCatalogueItemSchema>;

export const setCatalogueItemActiveSchema = z.object({
  id: itemIdSchema,
  active: z.boolean(),
});

export const deleteCatalogueItemSchema = z.object({ id: itemIdSchema });

export const reorderCatalogueSchema = z.object({
  kind: kindSchema,
  /** The city key when reordering the areas of one city; null for every other list. */
  parentKey: z.string().nullable(),
  orderedIds: z
    .array(itemIdSchema)
    .min(1, "Nothing to reorder.")
    .refine((ids) => new Set(ids).size === ids.length, { error: "Each item appears once." }),
});
