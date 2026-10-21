import { describe, expect, it, vi } from "vitest";
import {
  AVATAR_BATCH_MAX,
  listUserAvatars,
  listUserAvatarsOrEmpty,
  userAvatarBatchSchema,
} from "@/lib/db/avatars";
import type { AppSupabaseClient } from "@/lib/supabase/server";

function client(rpc: (name: string, args: { p_user_ids: string[] }) => unknown) {
  return { rpc: vi.fn(async (n: string, a: { p_user_ids: string[] }) => rpc(n, a)) } as unknown as AppSupabaseClient & {
    rpc: ReturnType<typeof vi.fn>;
  };
}

describe("avatar batch reader", () => {
  it("schema accepts the fields and their absence", () => {
    expect(userAvatarBatchSchema.safeParse({ a: { avatar_path: "p", avatar_preset: "mat", full_name: "A" } }).success).toBe(true);
    expect(userAvatarBatchSchema.safeParse({ a: {} }).success).toBe(true);
    expect(userAvatarBatchSchema.safeParse({ a: { avatar_path: null, avatar_preset: null } }).success).toBe(true);
    expect(userAvatarBatchSchema.safeParse({ a: { avatar_preset: 5 } }).success).toBe(false);
  });

  it("makes no call for no ids and dedupes ids", async () => {
    const c = client(() => ({ data: {}, error: null }));
    expect(await listUserAvatars(c, [null, undefined, ""])).toEqual({});
    expect(c.rpc).not.toHaveBeenCalled();
    await listUserAvatars(c, ["a", "a", "b"]);
    expect(c.rpc).toHaveBeenCalledWith("admin_user_avatars", { p_user_ids: ["a", "b"] });
  });

  it("maps the reply and splits batches over 200", async () => {
    const ids = Array.from({ length: AVATAR_BATCH_MAX + 1 }, (_, i) => `id${i}`);
    const c = client((_, a) => ({
      data: Object.fromEntries(a.p_user_ids.map((id) => [id, { avatar_path: null, avatar_preset: " mat " }])),
      error: null,
    }));
    const map = await listUserAvatars(c, ids);
    expect(c.rpc).toHaveBeenCalledTimes(2);
    expect(Object.keys(map)).toHaveLength(ids.length);
    expect(map.id0).toEqual({ path: null, preset: "mat" });
  });

  it("OrEmpty skips without users.read and degrades on failure", async () => {
    const ok = client(() => ({ data: { a: { avatar_preset: "rope" } }, error: null }));
    expect(await listUserAvatarsOrEmpty(ok, ["bookings.read"], ["a"])).toEqual({});
    expect(ok.rpc).not.toHaveBeenCalled();
    expect(await listUserAvatarsOrEmpty(ok, ["users.read"], ["a"])).toEqual({ a: { path: null, preset: "rope" } });
    const bad = client(() => ({ data: null, error: { message: "boom", code: "XX000" } }));
    expect(await listUserAvatarsOrEmpty(bad, ["users.read"], ["a"])).toEqual({});
    const garbage = client(() => ({ data: "nope", error: null }));
    expect(await listUserAvatarsOrEmpty(garbage, ["users.read"], ["a"])).toEqual({});
  });
});
