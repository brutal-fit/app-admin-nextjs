import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countRecipients: vi.fn(),
  listAnnouncements: vi.fn(),
  listActiveCatalogue: vi.fn(),
  getUser: vi.fn(),
  getSettingValue: vi.fn(),
}));

vi.mock("@/lib/db/announcements", () => ({
  countRecipients: mocks.countRecipients,
  listAnnouncements: mocks.listAnnouncements,
}));
vi.mock("@/lib/db/catalogue", () => ({ listActiveCatalogue: mocks.listActiveCatalogue }));
vi.mock("@/lib/db/rbac", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/db/settings", () => ({ getSettingValue: mocks.getSettingValue }));

import { loadAnnouncementsPage, pushEnabledFromSetting } from "@/features/announcements/api";
import { AppError } from "@/lib/supabase/errors";

const client = {} as never;
const access = { permissions: ["announcements.send"] } as never;

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.listAnnouncements.mockResolvedValue([]);
  mocks.listActiveCatalogue.mockResolvedValue([]);
});

describe("pushEnabledFromSetting", () => {
  it("is on only for the JSON value true, as the push dispatcher reads it", () => {
    expect(pushEnabledFromSetting(true)).toBe(true);
    expect(pushEnabledFromSetting(false)).toBe(false);
    expect(pushEnabledFromSetting(null)).toBe(false);
    expect(pushEnabledFromSetting("true")).toBe(false);
  });
});

describe("loadAnnouncementsPage push status", () => {
  it("reads push.enabled when the page loads", async () => {
    mocks.getSettingValue.mockResolvedValue(true);
    const result = await loadAnnouncementsPage(client, access);
    expect(mocks.getSettingValue).toHaveBeenCalledWith(client, "push.enabled");
    expect(result.push).toEqual({ ok: true, enabled: true });
  });

  it("treats a missing row as off", async () => {
    mocks.getSettingValue.mockResolvedValue(null);
    expect((await loadAnnouncementsPage(client, access)).push).toEqual({ ok: true, enabled: false });
  });

  it("reports a read failure without failing the page", async () => {
    mocks.getSettingValue.mockRejectedValue(new AppError("BRPRM"));
    const result = await loadAnnouncementsPage(client, access);
    expect(result.push.ok).toBe(false);
    expect(result.history.ok).toBe(true);
  });
});
