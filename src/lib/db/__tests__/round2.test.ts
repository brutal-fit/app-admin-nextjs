import { describe, expect, it, vi } from "vitest";
import { countRecipients } from "@/lib/db/announcements";
import { listTeam } from "@/lib/db/support";

function clientWith(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { rpc, client: { rpc } as never };
}

describe("countRecipients", () => {
  it("calls admin_count_recipients and returns a number", async () => {
    const { rpc, client } = clientWith({ data: "7" });
    expect(await countRecipients(client, { audience: "clients" } as never)).toBe(7);
    expect(rpc).toHaveBeenCalledWith("admin_count_recipients", { p_segment: { audience: "clients" } });
  });

  it("throws the mapped error", async () => {
    const { client } = clientWith({ error: { code: "42501", message: "denied" } });
    await expect(countRecipients(client, { audience: "all" } as never)).rejects.toBeDefined();
  });
});

describe("listTeam", () => {
  it("reads admin_list_team without arguments", async () => {
    const rows = [{ id: "u1", full_name: "Asha" }];
    const { rpc, client } = clientWith({ data: rows });
    expect(await listTeam(client)).toEqual(rows);
    expect(rpc).toHaveBeenCalledWith("admin_list_team");
  });
});
