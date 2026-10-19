import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  deleteCatalogueItem: vi.fn(),
  findCatalogueItem: vi.fn(),
  getCatalogueItem: vi.fn(),
  listCatalogueItems: vi.fn(),
  upsertCatalogueItem: vi.fn(),
  setSetting: vi.fn(),
  sendAnnouncement: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/catalogue", () => ({
  deleteCatalogueItem: mocks.deleteCatalogueItem,
  findCatalogueItem: mocks.findCatalogueItem,
  getCatalogueItem: mocks.getCatalogueItem,
  listCatalogueItems: mocks.listCatalogueItems,
  upsertCatalogueItem: mocks.upsertCatalogueItem,
  listActiveCatalogue: vi.fn(),
}));
vi.mock("@/lib/db/settings", () => ({ setSetting: mocks.setSetting }));
vi.mock("@/lib/db/announcements", () => ({
  sendAnnouncement: mocks.sendAnnouncement,
  listAnnouncements: vi.fn(),
  listTrainerIdsInCity: vi.fn(),
}));
vi.mock("@/lib/db/rbac", () => ({ getUser: vi.fn(), listUsers: vi.fn() }));

import {
  deleteCatalogueItemAction,
  reorderCatalogueAction,
  saveCatalogueItemAction,
  setCatalogueItemActiveAction,
} from "@/features/catalogue/actions";
import { setSettingAction } from "@/features/settings/actions";
import { sendAnnouncementAction } from "@/features/announcements/actions";
import { ForbiddenError } from "@/lib/rbac/require-permission";
import { AppError } from "@/lib/supabase/errors";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

const row = (id: string, key: string, sort_order: number, extra: Record<string, unknown> = {}) => ({
  id,
  kind: "goal",
  key,
  label: key,
  parent_key: null,
  sort_order,
  active: true,
  ...extra,
});

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({ permissions: [] });
});

describe("saveCatalogueItemAction", () => {
  const input = { mode: "create", kind: "goal", key: "strength", label: "Strength", parentKey: null, active: true };

  it("creates with the next sort order after its siblings", async () => {
    mocks.findCatalogueItem.mockResolvedValue(null);
    mocks.listCatalogueItems.mockResolvedValue([row(ID_A, "a", 10), row(ID_B, "b", 30)]);
    const result = await saveCatalogueItemAction(input);
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("catalogue.manage");
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledWith(
      {},
      { kind: "goal", key: "strength", label: "Strength", parentKey: null, sortOrder: 40, active: true },
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("refuses to overwrite an existing key on create", async () => {
    mocks.findCatalogueItem.mockResolvedValue(row(ID_A, "strength", 10));
    const result = await saveCatalogueItemAction(input);
    expect(result.ok).toBe(false);
    expect(mocks.upsertCatalogueItem).not.toHaveBeenCalled();
  });

  it("keeps the stored sort order on edit and fails when the item is gone", async () => {
    mocks.findCatalogueItem.mockResolvedValueOnce(row(ID_A, "strength", 70));
    await saveCatalogueItemAction({ ...input, mode: "edit", label: "Power" });
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledWith({}, expect.objectContaining({ sortOrder: 70, label: "Power" }));
    mocks.findCatalogueItem.mockResolvedValueOnce(null);
    expect((await saveCatalogueItemAction({ ...input, mode: "edit" })).ok).toBe(false);
  });

  it("sizes the sort order within one city for areas", async () => {
    mocks.findCatalogueItem.mockResolvedValue(null);
    mocks.listCatalogueItems.mockResolvedValue([
      row(ID_A, "x", 100, { kind: "area", parent_key: "pune" }),
      row(ID_B, "y", 20, { kind: "area", parent_key: "delhi" }),
    ]);
    await saveCatalogueItemAction({ ...input, kind: "area", parentKey: "delhi", key: "z" });
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledWith({}, expect.objectContaining({ sortOrder: 30 }));
  });

  it("rejects invalid input before any permission check", async () => {
    const result = await saveCatalogueItemAction({ ...input, key: "Bad Key" });
    expect(result.ok).toBe(false);
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });

  it("maps a missing permission to an error result", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("catalogue.manage"));
    expect((await saveCatalogueItemAction(input)).ok).toBe(false);
    expect(mocks.upsertCatalogueItem).not.toHaveBeenCalled();
  });
});

describe("setCatalogueItemActiveAction", () => {
  it("re-upserts the stored row with only active changed", async () => {
    mocks.getCatalogueItem.mockResolvedValue(row(ID_A, "a", 10, { label: "A" }));
    const result = await setCatalogueItemActiveAction({ id: ID_A, active: false });
    expect(result.ok).toBe(true);
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledWith(
      {},
      { kind: "goal", key: "a", label: "A", parentKey: null, sortOrder: 10, active: false },
    );
  });

  it("fails when the item is gone", async () => {
    mocks.getCatalogueItem.mockResolvedValue(null);
    expect((await setCatalogueItemActiveAction({ id: ID_A, active: false })).ok).toBe(false);
  });
});

describe("deleteCatalogueItemAction", () => {
  it("deletes and refreshes", async () => {
    expect((await deleteCatalogueItemAction({ id: ID_A })).ok).toBe(true);
    expect(mocks.deleteCatalogueItem).toHaveBeenCalledWith({}, ID_A);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("passes the backend's BRVAL reason through", async () => {
    mocks.deleteCatalogueItem.mockRejectedValue(new AppError("BRVAL", "City has areas; deactivate it."));
    const result = await deleteCatalogueItemAction({ id: ID_A });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain("City has areas");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("reorderCatalogueAction", () => {
  const stored = [row(ID_A, "a", 10), row(ID_B, "b", 20), row(ID_C, "c", 30)];

  it("writes only the items whose position changed", async () => {
    mocks.listCatalogueItems.mockResolvedValue(stored);
    const result = await reorderCatalogueAction({ kind: "goal", parentKey: null, orderedIds: [ID_A, ID_C, ID_B] });
    expect(result.ok).toBe(true);
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledTimes(2);
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledWith({}, expect.objectContaining({ key: "c", sortOrder: 20 }));
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledWith({}, expect.objectContaining({ key: "b", sortOrder: 30 }));
  });

  it("refuses a stale list", async () => {
    mocks.listCatalogueItems.mockResolvedValue(stored);
    const result = await reorderCatalogueAction({ kind: "goal", parentKey: null, orderedIds: [ID_A, ID_B] });
    expect(result.ok).toBe(false);
    expect(mocks.upsertCatalogueItem).not.toHaveBeenCalled();
  });

  it("limits an area reorder to one city", async () => {
    mocks.listCatalogueItems.mockResolvedValue([
      row(ID_A, "a", 10, { kind: "area", parent_key: "pune" }),
      row(ID_B, "b", 20, { kind: "area", parent_key: "pune" }),
      row(ID_C, "c", 10, { kind: "area", parent_key: "delhi" }),
    ]);
    const result = await reorderCatalogueAction({ kind: "area", parentKey: "pune", orderedIds: [ID_B, ID_A] });
    expect(result.ok).toBe(true);
    expect(mocks.upsertCatalogueItem).toHaveBeenCalledTimes(2);
  });
});

describe("setSettingAction", () => {
  it("validates, checks catalogue.manage and writes one key", async () => {
    const result = await setSettingAction({ key: "booking.cancellation_window_hours", value: 24 });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("catalogue.manage");
    expect(mocks.setSetting).toHaveBeenCalledWith({}, "booking.cancellation_window_hours", 24);
  });

  it("refuses a bad value without calling the function", async () => {
    const result = await setSettingAction({ key: "booking.cancellation_window_hours", value: 500 });
    expect(result.ok).toBe(false);
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  it("shows the server's text when it refuses", async () => {
    mocks.setSetting.mockRejectedValue(new AppError("BRVAL", "Server says no."));
    const result = await setSettingAction({ key: "trainer.max_rate_inr", value: 500 });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain("Server says no.");
  });
});

describe("sendAnnouncementAction", () => {
  const input = { segment: { audience: "clients" }, title: "Hi", body: "Hello", route: "/bookings" };

  it("checks announcements.send and returns the server's recipient count", async () => {
    mocks.sendAnnouncement.mockResolvedValue({ recipientCount: 42 });
    const result = await sendAnnouncementAction(input);
    expect(mocks.requirePermission).toHaveBeenCalledWith("announcements.send");
    expect(result).toEqual({ ok: true, data: { recipientCount: 42 } });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("does not send an invalid announcement", async () => {
    const result = await sendAnnouncementAction({ ...input, title: "" });
    expect(result.ok).toBe(false);
    expect(mocks.sendAnnouncement).not.toHaveBeenCalled();
  });
});
