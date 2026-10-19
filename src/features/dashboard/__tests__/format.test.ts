import { describe, expect, it } from "vitest";
import { describeAuditEntry, type ActivityContext } from "@/features/dashboard/format";
import type { AuditLogRow } from "@/types/database";

const context: ActivityContext = {
  userNames: new Map([["u1", "Asha Rao"]]),
  applicantNames: new Map([["t1", "Ravi Kumar"]]),
  canOpenRoles: true,
  canOpenUsers: true,
  canOpenApplications: true,
};

function row(action: string, overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: 1,
    actor_id: "a",
    actor_name: "Ops",
    action,
    target_id: null,
    details: {},
    created_at: "2026-10-19T10:00:00Z",
    ...overrides,
  };
}

describe("describeAuditEntry", () => {
  it("links a role to its page when permitted", () => {
    const d = describeAuditEntry(row("update_role", { target_id: "r1", details: { name: "Support" } }), context);
    expect(d.verb).toBe("updated the role");
    expect(d.target).toEqual({ label: "Support", href: "/roles/r1" });
  });

  it("drops the link without the permission", () => {
    const d = describeAuditEntry(
      row("update_role", { target_id: "r1", details: { name: "Support" } }),
      { ...context, canOpenRoles: false },
    );
    expect(d.target?.href).toBeNull();
  });

  it("never links a deleted role", () => {
    const d = describeAuditEntry(row("delete_role", { target_id: "r1", details: { key: "ops" } }), context);
    expect(d.target).toEqual({ label: "ops", href: null });
  });

  it("names the user and role for grants and revokes", () => {
    const grant = describeAuditEntry(row("assign_role", { target_id: "u1", details: { role: "ops" } }), context);
    expect(grant.verb).toBe("granted ops to");
    expect(grant.target).toEqual({ label: "Asha Rao", href: "/users/u1" });
    expect(describeAuditEntry(row("revoke_role", { target_id: "u1", details: { role: "ops" } }), context).verb).toBe(
      "revoked ops from",
    );
  });

  it("falls back for unknown users", () => {
    const d = describeAuditEntry(row("assign_role", { target_id: "zz" }), context);
    expect(d.verb).toBe("granted a role to");
    expect(d.target?.label).toBe("a user");
  });

  it("describes an application review with the status label", () => {
    const d = describeAuditEntry(row("review_application", { target_id: "t1", details: { status: "approved" } }), context);
    expect(d.verb).toMatch(/^moved to .+:$/);
    expect(d.target).toEqual({ label: "Ravi Kumar", href: "/applications/t1" });
  });

  it("shows unknown actions with the raw name", () => {
    const d = describeAuditEntry(row("do_new_thing"), context);
    expect(d).toEqual({ verb: "do new thing", target: null });
  });

  it("tolerates non-object details", () => {
    const d = describeAuditEntry(row("create_role", { details: null }), context);
    expect(d.target?.label).toBe("a role");
  });
});
