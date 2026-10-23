import { describe, expect, it } from "vitest";
import { ACCOUNT_STATUS_LABELS, PLATFORM_ROLE_LABELS, roleKeyLabel } from "@/features/users/format";

describe("user labels", () => {
  it("labels account statuses and platform roles", () => {
    expect(ACCOUNT_STATUS_LABELS.active).toBe("Active");
    expect(ACCOUNT_STATUS_LABELS.suspended).toBe("Suspended");
    expect(PLATFORM_ROLE_LABELS.client).toBe("Client");
    expect(PLATFORM_ROLE_LABELS.trainer).toBe("Trainer");
  });

  it("names an admin role from the roles table first", () => {
    expect(roleKeyLabel("super_admin", { super_admin: "Super admin" })).toBe("Super admin");
    expect(roleKeyLabel("ops", { ops: "  " })).toBe("Ops");
  });

  it("turns an unnamed key into words", () => {
    expect(roleKeyLabel("gym_manager")).toBe("Gym manager");
    expect(roleKeyLabel("")).toBe("");
  });
});
