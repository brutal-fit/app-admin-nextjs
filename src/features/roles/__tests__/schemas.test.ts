import { describe, expect, it } from "vitest";
import { createRoleSchema, updateRoleSchema } from "@/features/roles/schemas";

const base = { key: "ops_lead", name: "Ops lead", description: "", isAdmin: true };

describe("createRoleSchema", () => {
  it("accepts a valid role", () => {
    expect(createRoleSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a 60-character name and rejects 61", () => {
    expect(createRoleSchema.safeParse({ ...base, name: "a".repeat(60) }).success).toBe(true);
    expect(createRoleSchema.safeParse({ ...base, name: "a".repeat(61) }).success).toBe(false);
  });

  it("rejects a 1-character name", () => {
    expect(createRoleSchema.safeParse({ ...base, name: "a" }).success).toBe(false);
  });

  it("accepts a 300-character description and rejects 301", () => {
    expect(createRoleSchema.safeParse({ ...base, description: "d".repeat(300) }).success).toBe(
      true,
    );
    expect(createRoleSchema.safeParse({ ...base, description: "d".repeat(301) }).success).toBe(
      false,
    );
  });

  it("enforces the key pattern", () => {
    for (const key of ["ab", "Ops", "1ops", "ops-lead", "a".repeat(42)]) {
      expect(createRoleSchema.safeParse({ ...base, key }).success, key).toBe(false);
    }
    expect(createRoleSchema.safeParse({ ...base, key: "a".repeat(41) }).success).toBe(true);
  });
});

describe("updateRoleSchema", () => {
  it("applies the same name and description limits", () => {
    const id = "6f1b1c3e-3f5a-4a39-9a47-2d1d6f0e8a11";
    const ok = { id, name: "Ops", description: "", isAdmin: false };
    expect(updateRoleSchema.safeParse(ok).success).toBe(true);
    expect(updateRoleSchema.safeParse({ ...ok, name: "a".repeat(61) }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ ...ok, description: "d".repeat(301) }).success).toBe(
      false,
    );
  });
});
