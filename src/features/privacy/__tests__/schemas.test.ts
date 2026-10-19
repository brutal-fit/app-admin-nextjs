import { describe, expect, it } from "vitest";
import {
  EMPTY_PRIVACY_FILTERS,
  hasPrivacyFilters,
  parsePrivacyFilters,
  privacyListHref,
} from "@/features/privacy/schemas";

describe("parsePrivacyFilters", () => {
  it("defaults to every request", () => {
    expect(parsePrivacyFilters({})).toEqual(EMPTY_PRIVACY_FILTERS);
  });

  it("reads status, kind and page", () => {
    expect(parsePrivacyFilters({ status: "pending", kind: "data_export", page: "3" })).toEqual({
      status: "pending",
      kind: "data_export",
      page: 3,
    });
  });

  it("drops unknown values and takes the first of repeated params", () => {
    expect(parsePrivacyFilters({ status: "bogus", kind: ["account_deletion", "x"], page: "-2" })).toEqual({
      status: null,
      kind: "account_deletion",
      page: 1,
    });
  });
});

describe("privacyListHref", () => {
  it("builds the bare path without filters", () => {
    expect(privacyListHref(EMPTY_PRIVACY_FILTERS)).toBe("/privacy");
  });

  it("resets to page 1 when a filter changes", () => {
    const current = { status: "pending", kind: null, page: 4 } as const;
    expect(privacyListHref(current, { kind: "account_deletion" })).toBe("/privacy?status=pending&kind=account_deletion");
  });

  it("keeps an explicit page", () => {
    expect(privacyListHref(EMPTY_PRIVACY_FILTERS, { page: 2 })).toBe("/privacy?page=2");
  });
});

describe("hasPrivacyFilters", () => {
  it("is true only when status or kind is set", () => {
    expect(hasPrivacyFilters(EMPTY_PRIVACY_FILTERS)).toBe(false);
    expect(hasPrivacyFilters({ status: null, kind: "data_export", page: 1 })).toBe(true);
  });
});
