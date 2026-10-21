import { describe, expect, it, vi } from "vitest";
import { describePhone } from "@/features/users/format";
import {
  PHONE_BATCH_MAX,
  listUserPhones,
  listUserPhonesOrEmpty,
  userPhoneBatchSchema,
} from "@/lib/db/phones";
import type { AppSupabaseClient } from "@/lib/supabase/server";

function client(rpc: (name: string, args: { p_user_ids: string[] }) => unknown) {
  return { rpc: vi.fn(async (n: string, a: { p_user_ids: string[] }) => rpc(n, a)) } as unknown as AppSupabaseClient & {
    rpc: ReturnType<typeof vi.fn>;
  };
}

describe("phone batch reader", () => {
  it("schema accepts phones and nulls, refuses other values", () => {
    expect(userPhoneBatchSchema.safeParse({ a: "+919000000001", b: "*********0002", c: null }).success).toBe(true);
    expect(userPhoneBatchSchema.safeParse({}).success).toBe(true);
    expect(userPhoneBatchSchema.safeParse({ a: 919000000001 }).success).toBe(false);
    expect(userPhoneBatchSchema.safeParse([]).success).toBe(false);
  });

  it("makes no call for no ids and dedupes ids", async () => {
    const c = client(() => ({ data: {}, error: null }));
    expect(await listUserPhones(c, [null, undefined, ""])).toEqual({});
    expect(c.rpc).not.toHaveBeenCalled();
    await listUserPhones(c, ["a", "a", "b"]);
    expect(c.rpc).toHaveBeenCalledWith("admin_list_user_phones", { p_user_ids: ["a", "b"] });
  });

  it("merges the replies and splits batches over 200", async () => {
    const ids = Array.from({ length: PHONE_BATCH_MAX + 1 }, (_, i) => `id${i}`);
    const c = client((_, a) => ({
      data: Object.fromEntries(a.p_user_ids.map((id) => [id, id === "id0" ? null : "*********0001"])),
      error: null,
    }));
    const map = await listUserPhones(c, ids);
    expect(c.rpc).toHaveBeenCalledTimes(2);
    expect(c.rpc.mock.calls[0][1].p_user_ids).toHaveLength(PHONE_BATCH_MAX);
    expect(c.rpc.mock.calls[1][1].p_user_ids).toEqual([`id${PHONE_BATCH_MAX}`]);
    expect(Object.keys(map)).toHaveLength(ids.length);
    expect(map.id0).toBeNull();
    expect(map[`id${PHONE_BATCH_MAX}`]).toBe("*********0001");
  });

  it("throws on an error or an unknown shape", async () => {
    const bad = client(() => ({ data: null, error: { message: "Ask for at most 200 users at a time.", code: "BRVAL" } }));
    await expect(listUserPhones(bad, ["a"])).rejects.toBeTruthy();
    const garbage = client(() => ({ data: "nope", error: null }));
    await expect(listUserPhones(garbage, ["a"])).rejects.toThrow(/shape/);
  });

  it("OrEmpty skips without users.read and degrades on failure", async () => {
    const ok = client(() => ({ data: { a: "+919000000001" }, error: null }));
    expect(await listUserPhonesOrEmpty(ok, ["bookings.read"], ["a"])).toEqual({});
    expect(ok.rpc).not.toHaveBeenCalled();
    expect(await listUserPhonesOrEmpty(ok, ["users.read"], ["a"])).toEqual({ a: "+919000000001" });
    const bad = client(() => ({ data: null, error: { message: "boom", code: "XX000" } }));
    expect(await listUserPhonesOrEmpty(bad, ["users.read"], ["a"])).toEqual({});
    const garbage = client(() => ({ data: "nope", error: null }));
    expect(await listUserPhonesOrEmpty(garbage, ["users.read"], ["a"])).toEqual({});
  });
});

describe("describePhone", () => {
  it("formats a full Indian number", () => {
    expect(describePhone("+919000000001")).toEqual({ text: "+91 90000 00001", label: "+91 90000 00001", masked: false });
  });

  it("keeps a masked number and names its last four digits", () => {
    expect(describePhone("*********0001")).toEqual({ text: "*********0001", label: "Phone ending in 0001", masked: true });
  });

  it("leaves any other shape as it came", () => {
    expect(describePhone("+14155550100")).toEqual({ text: "+14155550100", label: "+14155550100", masked: false });
  });
});
