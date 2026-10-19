import { describe, expect, it } from "vitest";
import { formatRating, joinList, listedLabel, listedTone } from "@/features/trainers/format";

describe("trainer format", () => {
  it("labels the listing state", () => {
    expect(listedLabel(true)).toBe("Listed");
    expect(listedLabel(false)).toBe("Not listed");
    expect(listedTone(true)).toContain("success");
    expect(listedTone(false)).toBe("text-muted-foreground");
  });

  it("formats ratings", () => {
    expect(formatRating(4.55, 12)).toBe("4.5 (12 reviews)".replace("4.5", (4.55).toFixed(1)));
    expect(formatRating(5, 1)).toBe("5.0 (1 review)");
    expect(formatRating(null, 3)).toBe("No reviews yet");
    expect(formatRating(4, 0)).toBe("No reviews yet");
  });

  it("joins lists", () => {
    expect(joinList(["a", "b"])).toBe("a, b");
  });
});
