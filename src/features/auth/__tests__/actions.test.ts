import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  signOut: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));
vi.mock("@/lib/db/gyms-manager", () => ({ bindGymInvites: vi.fn() }));
vi.mock("@/lib/db/rbac", () => ({ getMyAccess: vi.fn() }));

import { signOutAction } from "@/features/auth/actions";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.createClient.mockResolvedValue({ auth: { signOut: mocks.signOut } });
});

describe("signOutAction", () => {
  it("signs out and redirects to the login page", async () => {
    await signOutAction();
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("still redirects when the session is already broken", async () => {
    mocks.signOut.mockRejectedValue(new Error("no session"));
    await signOutAction();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
