import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/rbac/require-permission";
import { AppError } from "@/lib/supabase/errors";

const requirePermission = vi.fn();
const listAuditLog = vi.fn();

vi.mock("@/lib/rbac/require-permission", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac/require-permission")>();
  return { ...actual, requirePermission: (key: string) => requirePermission(key) };
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/db/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/audit")>();
  return { ...actual, listAuditLog: (...args: unknown[]) => listAuditLog(...args) };
});

import { GET } from "@/app/api/audit/export/route";

function auditRow(id: number, total: number) {
  return {
    id,
    actor_id: null,
    actor_name: "Asha",
    action: "create_role",
    target_id: null,
    details: {},
    created_at: "2026-10-19T10:00:00Z",
    total_count: total,
  };
}

const request = (query = "") => new Request(`http://localhost/api/audit/export${query}`);

beforeEach(() => {
  requirePermission.mockReset().mockResolvedValue({});
  listAuditLog.mockReset();
});

describe("GET /api/audit/export", () => {
  it("refuses without audit.export", async () => {
    requirePermission.mockImplementation(async (key: string) => {
      if (key === "audit.export") throw new ForbiddenError("audit.export");
      return {};
    });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(listAuditLog).not.toHaveBeenCalled();
  });

  it("refuses without audit.read", async () => {
    requirePermission.mockImplementation(async (key: string) => {
      if (key === "audit.read") throw new ForbiddenError("audit.read");
      return {};
    });
    expect((await GET(request())).status).toBe(403);
    expect(listAuditLog).not.toHaveBeenCalled();
  });

  it("rejects an inverted range with 400", async () => {
    const res = await GET(request("?from=2026-10-05&to=2026-10-01"));
    expect(res.status).toBe(400);
    expect(listAuditLog).not.toHaveBeenCalled();
  });

  it("maps a database refusal on the first call to its status", async () => {
    listAuditLog.mockRejectedValue(new AppError("BRPRM"));
    expect((await GET(request())).status).toBe(403);
    listAuditLog.mockRejectedValue(new AppError("BRVAL"));
    expect((await GET(request())).status).toBe(400);
    listAuditLog.mockRejectedValue(new AppError("NETWORK"));
    expect((await GET(request())).status).toBe(500);
  });

  it("streams a CSV with header, rows and download headers", async () => {
    listAuditLog.mockResolvedValue({ rows: [auditRow(2, 2), auditRow(1, 2)], total: 2 });
    const res = await GET(request("?from=2026-10-01&to=2026-10-19&action=create_role"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="audit-2026-10-01-2026-10-19.csv"');
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Total-Count")).toBe("2");
    const lines = (await res.text()).split("\r\n").filter(Boolean);
    expect(lines[0]).toBe("id,created_at,actor_id,actor_name,action,target_id,details");
    expect(lines).toHaveLength(3);
    const first = listAuditLog.mock.calls[0]![1];
    expect(first).toMatchObject({ action: "create_role", offset: 0 });
    expect(first.from).toBe("2026-09-30T18:30:00.000Z");
  });

  it("follows the offset across several calls and stops at the total", async () => {
    const total = 12000;
    listAuditLog.mockImplementation(async (_c: unknown, q: { offset: number; limit: number }) => {
      const n = Math.min(q.limit, total - q.offset);
      return { rows: Array.from({ length: n }, (_, i) => auditRow(total - q.offset - i, total)), total };
    });
    const res = await GET(request());
    const lines = (await res.text()).split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(total + 1);
    expect(listAuditLog).toHaveBeenCalledTimes(2);
    expect(listAuditLog.mock.calls[1]![1]).toMatchObject({ offset: 10000, limit: 2000 });
  });

  it("caps the export at 50,000 rows", async () => {
    listAuditLog.mockImplementation(async (_c: unknown, q: { offset: number; limit: number }) => ({
      rows: Array.from({ length: q.limit }, (_, i) => auditRow(q.offset + i, 80000)),
      total: 80000,
    }));
    const res = await GET(request());
    const text = await res.text();
    expect(text.split("\r\n").filter(Boolean)).toHaveLength(50001);
    expect(listAuditLog).toHaveBeenCalledTimes(5);
  });

  it("aborts the download when a later call fails", async () => {
    listAuditLog
      .mockResolvedValueOnce({ rows: Array.from({ length: 10000 }, (_, i) => auditRow(i, 20000)), total: 20000 })
      .mockRejectedValueOnce(new AppError("NETWORK"));
    const res = await GET(request());
    await expect(res.text()).rejects.toBeDefined();
  });
});
