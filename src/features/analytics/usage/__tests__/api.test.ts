import { describe, expect, it, vi } from "vitest";
import { loadUsage } from "@/features/analytics/usage/api";

describe("loadUsage", () => {
  it("reports a range over 366 days without calling the server", async () => {
    const rpc = vi.fn();
    const result = await loadUsage({ rpc } as never, { from: "2025-01-01", to: "2026-10-20" });
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports an inverted range without calling the server", async () => {
    const rpc = vi.fn();
    const result = await loadUsage({ rpc } as never, { from: "2026-10-20", to: "2026-10-01" });
    expect(result).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns an error result when a reader fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    const result = await loadUsage({ rpc } as never, { from: "2026-10-01", to: "2026-10-20" });
    expect(result.ok).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(5);
  });
});
