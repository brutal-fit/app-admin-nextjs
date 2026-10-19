import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  notePasswordReset: vi.fn(),
  getUserById: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/rbac/require-permission", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac/require-permission")>();
  return { ...actual, requirePermission: (key: string) => mocks.requirePermission(key) };
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/db/users", () => ({ notePasswordReset: mocks.notePasswordReset }));
vi.mock("@/server/service-client", () => ({
  isServiceRoleConfigured: () => true,
  createServiceClient: () => ({
    auth: { admin: { getUserById: mocks.getUserById }, resetPasswordForEmail: mocks.resetPasswordForEmail },
  }),
}));

import { POST } from "@/app/api/users/password-reset/route";

const UID = "6f1c1f1e-1c1e-4b1e-8c1e-1c1e1c1e1c1e";
const post = (body: unknown) =>
  new Request("http://localhost/api/users/password-reset", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  mocks.requirePermission.mockReset().mockResolvedValue({});
  mocks.notePasswordReset.mockReset().mockResolvedValue(undefined);
  mocks.getUserById.mockReset().mockResolvedValue({ data: { user: { email: "a@example.com" } }, error: null });
  mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
});

describe("POST /api/users/password-reset", () => {
  it("notes the reset after Auth sent the email", async () => {
    const res = await POST(post({ userId: UID }));
    expect(res.status).toBe(200);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("a@example.com");
    expect(mocks.notePasswordReset).toHaveBeenCalledTimes(1);
    expect(mocks.notePasswordReset.mock.calls[0][1]).toBe(UID);
    expect(mocks.resetPasswordForEmail.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.notePasswordReset.mock.invocationCallOrder[0],
    );
  });

  it("still answers ok and logs to the console when the note fails", async () => {
    mocks.notePasswordReset.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ userId: UID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: true });
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0][0])).not.toContain("a@example.com");
    spy.mockRestore();
  });

  it("does not note when Auth fails to send", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { message: "rate limited", status: 429 } });
    const res = await POST(post({ userId: UID }));
    expect(res.ok).toBe(false);
    expect(mocks.notePasswordReset).not.toHaveBeenCalled();
  });

  it("rejects an invalid body without touching Auth", async () => {
    const res = await POST(post({ userId: "nope" }));
    expect(res.status).toBe(400);
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.notePasswordReset).not.toHaveBeenCalled();
  });
});
