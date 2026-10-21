import { describe, expect, it } from "vitest";
import { userAvatarsSchema } from "@/features/users/schemas";

const id = "11111111-1111-4111-8111-111111111111";

describe("userAvatarsSchema", () => {
  it("accepts up to 200 ids", () => {
    expect(userAvatarsSchema.safeParse({ ids: [id] }).success).toBe(true);
    expect(userAvatarsSchema.safeParse({ ids: Array(200).fill(id) }).success).toBe(true);
  });
  it("rejects more than 200 and non-guids", () => {
    expect(userAvatarsSchema.safeParse({ ids: Array(201).fill(id) }).success).toBe(false);
    expect(userAvatarsSchema.safeParse({ ids: ["x"] }).success).toBe(false);
  });
});
