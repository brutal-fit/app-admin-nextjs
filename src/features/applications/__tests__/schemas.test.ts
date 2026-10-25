import { describe, expect, it } from "vitest";
import {
  missingPriceMessage,
  parseApplicationFilter,
  reviewApplicationSchema,
  reviewDocumentSchema,
} from "@/features/applications/schemas";

const TRAINER = "11111111-1111-4111-8111-111111111111";

describe("parseApplicationFilter", () => {
  it("accepts known statuses and falls back to all", () => {
    expect(parseApplicationFilter("approved")).toBe("approved");
    expect(parseApplicationFilter(["rejected", "approved"])).toBe("rejected");
    expect(parseApplicationFilter("draft")).toBe("all");
    expect(parseApplicationFilter(undefined)).toBe("all");
  });
});

describe("missingPriceMessage", () => {
  it("only applies when approving", () => {
    expect(missingPriceMessage("rejected", ["home"], { home: null, online: null })).toBeNull();
    expect(missingPriceMessage("", ["home"], { home: null, online: null })).toBeNull();
  });

  it("requires a price for each offered mode", () => {
    expect(missingPriceMessage("approved", ["home"], { home: null, online: 500 })).toMatch(/home/);
    expect(missingPriceMessage("approved", ["online"], { home: 500, online: null })).toMatch(
      /online/,
    );
    expect(
      missingPriceMessage("approved", ["home", "online"], { home: 500, online: null }),
    ).toMatch(/online/);
  });

  it("passes when every offered mode is priced", () => {
    expect(
      missingPriceMessage("approved", ["home", "online"], { home: 500, online: 400 }),
    ).toBeNull();
    expect(missingPriceMessage("approved", ["online"], { home: null, online: 400 })).toBeNull();
  });
});

describe("reviewApplicationSchema", () => {
  const base = {
    trainerId: TRAINER,
    status: "approved",
    note: "  ",
    homeRateInr: 1200,
    onlineRateInr: null,
    verifiedChecks: ["government_id"],
  };

  it("accepts a valid decision and turns a blank note into null", () => {
    const parsed = reviewApplicationSchema.parse(base);
    expect(parsed.note).toBeNull();
  });

  it("refuses under review as a manual decision", () => {
    expect(reviewApplicationSchema.safeParse({ ...base, status: "under_review" }).success).toBe(false);
  });

  it("needs a note to reject or ask for information", () => {
    for (const status of ["rejected", "needs_information"]) {
      const result = reviewApplicationSchema.safeParse({ ...base, status, note: " " });
      expect(result.success).toBe(false);
      expect(reviewApplicationSchema.safeParse({ ...base, status, note: "Blurry ID" }).success).toBe(true);
    }
  });

  it("rejects draft and submitted as decisions", () => {
    expect(reviewApplicationSchema.safeParse({ ...base, status: "draft" }).success).toBe(false);
    expect(reviewApplicationSchema.safeParse({ ...base, status: "submitted" }).success).toBe(
      false,
    );
  });

  it("rejects bad prices and unknown checks", () => {
    expect(reviewApplicationSchema.safeParse({ ...base, homeRateInr: 0 }).success).toBe(false);
    expect(reviewApplicationSchema.safeParse({ ...base, homeRateInr: 100001 }).success).toBe(
      false,
    );
    expect(reviewApplicationSchema.safeParse({ ...base, homeRateInr: 10.5 }).success).toBe(false);
    expect(reviewApplicationSchema.safeParse({ ...base, verifiedChecks: ["selfie"] }).success).toBe(
      false,
    );
  });

  it("rejects an over-long note and a bad trainer id", () => {
    expect(reviewApplicationSchema.safeParse({ ...base, note: "x".repeat(1001) }).success).toBe(
      false,
    );
    expect(reviewApplicationSchema.safeParse({ ...base, trainerId: "nope" }).success).toBe(false);
  });
});

describe("reviewDocumentSchema", () => {
  it("accepts accept and reject only", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    expect(reviewDocumentSchema.safeParse({ documentId: id, status: "accepted", note: "" }).success).toBe(true);
    expect(reviewDocumentSchema.safeParse({ documentId: id, status: "uploaded", note: "" }).success).toBe(false);
    expect(reviewDocumentSchema.safeParse({ documentId: id, status: "rejected", note: "y".repeat(501) }).success).toBe(false);
  });
});
