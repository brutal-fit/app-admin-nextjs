import { describe, expect, it } from "vitest";
import {
  moveItem,
  nextSortOrder,
  parseCatalogueKind,
  catalogueHref,
  reorderCatalogueSchema,
  saveCatalogueItemSchema,
  sortOrdersFor,
  suggestCatalogueKey,
} from "@/features/catalogue/schemas";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

describe("saveCatalogueItemSchema", () => {
  const base = { mode: "create", kind: "specialty", key: "yoga", label: "Yoga", parentKey: null, active: true };

  it("accepts a valid item and lowercases the key", () => {
    const parsed = saveCatalogueItemSchema.safeParse({ ...base, key: " Yoga_2 " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.key).toBe("yoga_2");
  });

  it("rejects a bad key and an empty or long label", () => {
    expect(saveCatalogueItemSchema.safeParse({ ...base, key: "has space" }).success).toBe(false);
    expect(saveCatalogueItemSchema.safeParse({ ...base, key: "_lead" }).success).toBe(false);
    expect(saveCatalogueItemSchema.safeParse({ ...base, label: " " }).success).toBe(false);
    expect(saveCatalogueItemSchema.safeParse({ ...base, label: "x".repeat(81) }).success).toBe(false);
  });

  it("requires a city for an area and forbids one elsewhere", () => {
    expect(saveCatalogueItemSchema.safeParse({ ...base, kind: "area" }).success).toBe(false);
    expect(saveCatalogueItemSchema.safeParse({ ...base, kind: "area", parentKey: "pune" }).success).toBe(true);
    expect(saveCatalogueItemSchema.safeParse({ ...base, parentKey: "pune" }).success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(saveCatalogueItemSchema.safeParse({ ...base, kind: "color" }).success).toBe(false);
  });
});

describe("reorderCatalogueSchema", () => {
  it("rejects an empty list and duplicates", () => {
    expect(reorderCatalogueSchema.safeParse({ kind: "goal", parentKey: null, orderedIds: [] }).success).toBe(false);
    expect(
      reorderCatalogueSchema.safeParse({ kind: "goal", parentKey: null, orderedIds: [ID_A, ID_A] }).success,
    ).toBe(false);
    expect(
      reorderCatalogueSchema.safeParse({ kind: "goal", parentKey: null, orderedIds: [ID_A, ID_B] }).success,
    ).toBe(true);
  });
});

describe("ordering helpers", () => {
  it("moves an item up or down and stays put at the edges", () => {
    expect(moveItem(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, "down")).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, "up")).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, "down")).toEqual(["a", "b", "c"]);
  });

  it("spaces sort orders 10 apart, then 1, then gives up", () => {
    expect(sortOrdersFor(3)).toEqual([10, 20, 30]);
    expect(sortOrdersFor(1500)?.slice(0, 3)).toEqual([1, 2, 3]);
    expect(sortOrdersFor(10001)).toBeNull();
  });

  it("picks the next sort order, capped", () => {
    expect(nextSortOrder([])).toBe(10);
    expect(nextSortOrder([10, 40])).toBe(50);
    expect(nextSortOrder([10000])).toBe(10000);
  });
});

describe("key and kind helpers", () => {
  it("suggests a key from a label", () => {
    expect(suggestCatalogueKey("Weight Loss & Toning!")).toBe("weight_loss_and_toning");
  });

  it("falls back to specialty for an unknown kind", () => {
    expect(parseCatalogueKind("area")).toBe("area");
    expect(parseCatalogueKind(["goal", "x"])).toBe("goal");
    expect(parseCatalogueKind("nope")).toBe("specialty");
    expect(parseCatalogueKind(undefined)).toBe("specialty");
    expect(catalogueHref("specialty")).toBe("/catalogue");
    expect(catalogueHref("city")).toBe("/catalogue?kind=city");
  });
});
