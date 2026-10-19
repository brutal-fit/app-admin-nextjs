import { describe, expect, it } from "vitest";
import { can, hasPanelAccess } from "@/lib/rbac/can";

describe("can", () => {
  it("is true when the list holds the key", () => {
    expect(can(["users.read", "rbac.manage"], "rbac.manage")).toBe(true);
  });

  it("is false when the key is missing", () => {
    expect(can(["users.read"], "rbac.manage")).toBe(false);
  });

  it("is false for null, undefined and empty lists", () => {
    expect(can(null, "users.read")).toBe(false);
    expect(can(undefined, "users.read")).toBe(false);
    expect(can([], "users.read")).toBe(false);
  });

  it("treats a union of several roles' permissions as one list", () => {
    const union = [...["users.read"], ...["rbac.manage", "users.read"]];
    expect(can(union, "users.read")).toBe(true);
    expect(can(union, "rbac.manage")).toBe(true);
    expect(can(union, "audit.read")).toBe(false);
  });
});

describe("hasPanelAccess", () => {
  it("needs the admin flag and at least one permission", () => {
    expect(hasPanelAccess({ adminAccess: true, permissions: ["users.read"] })).toBe(true);
    expect(hasPanelAccess({ adminAccess: true, permissions: [] })).toBe(false);
    expect(hasPanelAccess({ adminAccess: false, permissions: ["users.read"] })).toBe(false);
    expect(hasPanelAccess({ adminAccess: false, permissions: [] })).toBe(false);
  });
});
