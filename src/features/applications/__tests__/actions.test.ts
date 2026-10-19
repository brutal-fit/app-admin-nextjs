import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  getApplicationModes: vi.fn(),
  reviewApplication: vi.fn(),
  reviewDocument: vi.fn(),
  createDocumentSignedUrl: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/applications", () => ({
  getApplicationModes: mocks.getApplicationModes,
  reviewApplication: mocks.reviewApplication,
  reviewDocument: mocks.reviewDocument,
  createDocumentSignedUrl: mocks.createDocumentSignedUrl,
}));

import {
  openDocumentAction,
  reviewApplicationAction,
  reviewDocumentAction,
} from "@/features/applications/actions";
import { ForbiddenError } from "@/lib/rbac/require-permission";

const TRAINER = "11111111-1111-4111-8111-111111111111";
const DOC = "22222222-2222-4222-8222-222222222222";

const approve = {
  trainerId: TRAINER,
  status: "approved",
  note: "",
  homeRateInr: 1400,
  onlineRateInr: null,
  verifiedChecks: ["certificate"],
};

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({});
});

describe("reviewApplicationAction", () => {
  it("checks applications.review and calls the data layer, then refreshes", async () => {
    mocks.getApplicationModes.mockResolvedValue(["home"]);
    const result = await reviewApplicationAction(approve);
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("applications.review");
    expect(mocks.reviewApplication).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        trainerId: TRAINER,
        status: "approved",
        note: null,
        homeRateInr: 1400,
        verifiedChecks: ["certificate"],
      }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("refuses to approve when the database modes need a price that is missing", async () => {
    mocks.getApplicationModes.mockResolvedValue(["home", "online"]);
    const result = await reviewApplicationAction(approve);
    expect(result.ok).toBe(false);
    expect(mocks.reviewApplication).not.toHaveBeenCalled();
  });

  it("drops prices and checks for non-approval decisions", async () => {
    await reviewApplicationAction({ ...approve, status: "rejected" });
    expect(mocks.reviewApplication).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ homeRateInr: null, onlineRateInr: null, verifiedChecks: null }),
    );
    expect(mocks.getApplicationModes).not.toHaveBeenCalled();
  });

  it("returns a validation error without touching permission or data", async () => {
    const result = await reviewApplicationAction({ ...approve, status: "draft" });
    expect(result.ok).toBe(false);
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.reviewApplication).not.toHaveBeenCalled();
  });

  it("maps a missing permission to an error result", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("applications.review"));
    const result = await reviewApplicationAction({ ...approve, status: "rejected" });
    expect(result.ok).toBe(false);
    expect(mocks.reviewApplication).not.toHaveBeenCalled();
  });
});

describe("reviewDocumentAction", () => {
  it("checks documents.review and calls review_document", async () => {
    const result = await reviewDocumentAction({ documentId: DOC, status: "rejected", note: "blurry" });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("documents.review");
    expect(mocks.reviewDocument).toHaveBeenCalledWith(
      {},
      { documentId: DOC, status: "rejected", note: "blurry" },
    );
  });
});

describe("openDocumentAction", () => {
  it("returns the signed url under documents.review", async () => {
    mocks.createDocumentSignedUrl.mockResolvedValue("https://signed.example/x");
    const result = await openDocumentAction({ documentId: DOC });
    expect(result).toEqual({ ok: true, data: { url: "https://signed.example/x" } });
    expect(mocks.requirePermission).toHaveBeenCalledWith("documents.review");
  });

  it("rejects a non-uuid id", async () => {
    const result = await openDocumentAction({ documentId: "../etc" });
    expect(result.ok).toBe(false);
    expect(mocks.createDocumentSignedUrl).not.toHaveBeenCalled();
  });
});
