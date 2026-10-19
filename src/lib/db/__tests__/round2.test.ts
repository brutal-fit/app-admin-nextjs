import { describe, expect, it, vi } from "vitest";
import { countRecipients } from "@/lib/db/announcements";
import { listTeam } from "@/lib/db/support";
import { notePasswordReset } from "@/lib/db/users";

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

describe("notePasswordReset", () => {
  it("calls admin_note_password_reset with the user", async () => {
    const { rpc, client } = clientWith({});
    await notePasswordReset(client, "u1");
    expect(rpc).toHaveBeenCalledWith("admin_note_password_reset", { p_user: "u1" });
  });

  it("throws when the note fails", async () => {
    const { client } = clientWith({ error: { code: "42501", message: "denied" } });
    await expect(notePasswordReset(client, "u1")).rejects.toBeDefined();
  });
});
