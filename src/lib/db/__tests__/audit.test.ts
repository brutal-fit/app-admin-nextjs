import { describe, expect, it, vi } from "vitest";
import { listAuditLog, type AuditQuery } from "@/lib/db/audit";
import type { AppSupabaseClient } from "@/lib/supabase/server";

const query: AuditQuery = {
  actorId: "a",
  action: "create_role",
  targetId: null,
  from: "2026-10-01T00:00:00Z",
  to: null,
  search: "x",
  limit: 50,
  offset: 100,
};

function client(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { rpc, client: { rpc } as unknown as AppSupabaseClient };
}

describe("listAuditLog", () => {
  it("passes every filter as a named argument", async () => {
    const { rpc, client: c } = client({ data: [], error: null });
    await listAuditLog(c, query);
    expect(rpc).toHaveBeenCalledWith("admin_list_audit", {
      p_actor: "a",
      p_action: "create_role",
      p_target: null,
      p_from: "2026-10-01T00:00:00Z",
      p_to: null,
      p_search: "x",
      p_limit: 50,
      p_offset: 100,
    });
  });

  it("reads the total from the first row", async () => {
    const rows = [
      { id: 2, total_count: "120" },
      { id: 1, total_count: "120" },
    ];
    const { client: c } = client({ data: rows, error: null });
    const page = await listAuditLog(c, query);
    expect(page.total).toBe(120);
    expect(page.rows).toHaveLength(2);
  });

  it("reports zero for an empty page or null data", async () => {
    expect((await listAuditLog(client({ data: [], error: null }).client, query)).total).toBe(0);
    expect((await listAuditLog(client({ data: null, error: null }).client, query)).rows).toEqual([]);
  });

  it("throws an AppError with the SQLSTATE code", async () => {
    const { client: c } = client({ data: null, error: { code: "BRPRM", message: "denied" } });
    await expect(listAuditLog(c, query)).rejects.toMatchObject({ code: "BRPRM" });
  });
});
