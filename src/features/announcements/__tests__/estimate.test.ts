import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAnnouncements: vi.fn(),
  listTrainerIdsInCity: vi.fn(),
  listActiveCatalogue: vi.fn(),
  getUser: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/db/announcements", () => ({
  listAnnouncements: mocks.listAnnouncements,
  listTrainerIdsInCity: mocks.listTrainerIdsInCity,
}));
vi.mock("@/lib/db/catalogue", () => ({ listActiveCatalogue: mocks.listActiveCatalogue }));
vi.mock("@/lib/db/rbac", () => ({ getUser: mocks.getUser, listUsers: mocks.listUsers }));

import { estimateRecipients, matchesSegment } from "@/features/announcements/api";
import { AppError } from "@/lib/supabase/errors";
import type { SessionAccess } from "@/types/access";
import type { AccountStatus } from "@/types/database";

const client = {} as never;
const accessWith = (...permissions: string[]) => ({ permissions }) as unknown as SessionAccess;
const full = accessWith("users.read", "applications.read", "announcements.send");

const user = (id: string, platform_role: "client" | "trainer" | null, account_status: AccountStatus = "active") => ({
  id,
  platform_role,
  account_status,
});

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe("matchesSegment", () => {
  it("skips inactive accounts and applies the audience", () => {
    expect(matchesSegment(user("a", "client", "suspended"), { audience: "all" }, null)).toBe(false);
    expect(matchesSegment(user("a", null), { audience: "all" }, null)).toBe(false);
    expect(matchesSegment(user("a", "client"), { audience: "all" }, null)).toBe(true);
    expect(matchesSegment(user("a", "trainer"), { audience: "clients" }, null)).toBe(false);
    expect(matchesSegment(user("a", "trainer"), { audience: "trainers" }, null)).toBe(true);
    expect(matchesSegment(user("a", "trainer"), { audience: "trainers", city: "Pune" }, new Set(["b"]))).toBe(false);
    expect(matchesSegment(user("a", "trainer"), { audience: "trainers", city: "Pune" }, new Set(["a"]))).toBe(true);
  });
});

describe("estimateRecipients", () => {
  it("says which permission is missing instead of guessing", async () => {
    const result = await estimateRecipients(client, accessWith(), { audience: "all" });
    expect(result.kind).toBe("unavailable");
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("needs applications.read for a city", async () => {
    const result = await estimateRecipients(client, accessWith("users.read"), { audience: "trainers", city: "Pune" });
    expect(result.kind).toBe("unavailable");
  });

  it("counts one person exactly, and zero when not found", async () => {
    mocks.getUser.mockResolvedValueOnce(user("a", "client"));
    expect(await estimateRecipients(client, full, { audience: "user", user_id: "a" })).toEqual({ kind: "exact", count: 1 });
    mocks.getUser.mockRejectedValueOnce(new AppError("BRNTF", "gone"));
    expect(await estimateRecipients(client, full, { audience: "user", user_id: "b" })).toEqual({ kind: "exact", count: 0 });
  });

  it("counts matching users on a short page as exact", async () => {
    mocks.listUsers.mockResolvedValueOnce([user("a", "client"), user("b", "trainer"), user("c", "client", "suspended")]);
    expect(await estimateRecipients(client, full, { audience: "clients" })).toEqual({ kind: "exact", count: 1 });
  });

  it("returns zero without scanning when the city has no trainers", async () => {
    mocks.listTrainerIdsInCity.mockResolvedValueOnce(new Set());
    expect(await estimateRecipients(client, full, { audience: "trainers", city: "Pune" })).toEqual({ kind: "exact", count: 0 });
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("reports a floor when the page cap is hit", async () => {
    const page = Array.from({ length: 200 }, (_, i) => user(`u${i}`, "client"));
    mocks.listUsers.mockResolvedValue(page);
    const result = await estimateRecipients(client, full, { audience: "clients" });
    expect(result).toEqual({ kind: "floor", count: 5000, scanned: 5000 });
    expect(mocks.listUsers).toHaveBeenCalledTimes(25);
  });
});
