import { describe, expect, it } from "vitest";
import {
  EMPTY_REVIEW_FILTERS,
  hasReviewFilters,
  moderateReviewSchema,
  parseReviewFilters,
  reviewListHref,
  toBoolean,
} from "@/features/reviews/schemas";

const ID = "11111111-1111-4111-8111-111111111111";

describe("parseReviewFilters", () => {
  it("reads valid values and drops unknown ones", () => {
    expect(parseReviewFilters({ reported: "yes", hidden: "no", trainer: ID, page: "2" })).toEqual({
      reported: "yes",
      hidden: "no",
      trainerId: ID,
      page: 2,
    });
    expect(parseReviewFilters({ reported: "maybe", hidden: "1", trainer: "x", page: "0" })).toEqual(
      EMPTY_REVIEW_FILTERS,
    );
  });
});

describe("reviewListHref", () => {
  it("round-trips and resets the page on change", () => {
    const filters = parseReviewFilters({ reported: "yes", trainer: ID, page: "3" });
    const href = reviewListHref(filters, { page: 3 });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseReviewFilters(params)).toEqual(filters);
    expect(reviewListHref({ ...EMPTY_REVIEW_FILTERS, page: 5 }, { hidden: "yes" })).toBe("/reviews?hidden=yes");
    expect(reviewListHref(EMPTY_REVIEW_FILTERS)).toBe("/reviews");
  });

  it("hasReviewFilters and toBoolean", () => {
    expect(hasReviewFilters({ ...EMPTY_REVIEW_FILTERS, page: 2 })).toBe(false);
    expect(hasReviewFilters({ ...EMPTY_REVIEW_FILTERS, hidden: "no" })).toBe(true);
    expect(toBoolean("yes")).toBe(true);
    expect(toBoolean("no")).toBe(false);
    expect(toBoolean(null)).toBeNull();
  });
});

describe("moderateReviewSchema", () => {
  it("requires a reason for hide and restore", () => {
    expect(moderateReviewSchema.safeParse({ reviewId: ID, hidden: true, reason: " " }).success).toBe(false);
    expect(moderateReviewSchema.safeParse({ reviewId: ID, hidden: false, reason: "resolved" }).success).toBe(true);
  });

  it("caps the reason at 500 and needs a boolean and a valid id", () => {
    expect(moderateReviewSchema.safeParse({ reviewId: ID, hidden: true, reason: "a".repeat(501) }).success).toBe(false);
    expect(moderateReviewSchema.safeParse({ reviewId: ID, reason: "ok" }).success).toBe(false);
    expect(moderateReviewSchema.safeParse({ reviewId: "x", hidden: true, reason: "ok" }).success).toBe(false);
  });
});
