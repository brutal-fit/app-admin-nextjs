import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countRecipients: vi.fn(),
  listAnnouncements: vi.fn(),
  listActiveCatalogue: vi.fn(),
  getUser: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/db/announcements", () => ({
  countRecipients: mocks.countRecipients,
  listAnnouncements: mocks.listAnnouncements,
}));
vi.mock("@/lib/db/catalogue", () => ({ listActiveCatalogue: mocks.listActiveCatalogue }));
vi.mock("@/lib/db/rbac", () => ({ getUser: mocks.getUser, listUsers: mocks.listUsers }));

import { estimateRecipients } from "@/features/announcements/api";
import { AppError } from "@/lib/supabase/errors";

const client = {} as never;

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe("estimateRecipients", () => {
  it("returns the server count and never pages users", async () => {
    mocks.countRecipients.mockResolvedValue(42);
    const segment = { audience: "clients" } as never;
    expect(await estimateRecipients(client, segment)).toEqual({ count: 42 });
    expect(mocks.countRecipients).toHaveBeenCalledWith(client, segment);
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("passes zero through so the composer can disable Send", async () => {
    mocks.countRecipients.mockResolvedValue(0);
    expect(await estimateRecipients(client, { audience: "all" } as never)).toEqual({ count: 0 });
  });

  it("propagates a server error", async () => {
    mocks.countRecipients.mockRejectedValue(new AppError("BRPRM"));
    await expect(estimateRecipients(client, { audience: "all" } as never)).rejects.toMatchObject({ code: "BRPRM" });
  });
});
