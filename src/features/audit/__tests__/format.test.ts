import { describe, expect, it } from "vitest";
import {
  auditCsvHeader,
  auditCsvRow,
  auditTarget,
  csvCell,
  formatAuditDetails,
  hasAuditDetails,
} from "@/features/audit/format";
import { AUDIT_ACTIONS } from "@/features/audit/schemas";
import type { AuditLogRow } from "@/types/database";

const ID = "abcdef12-0000-0000-0000-000000000001";

function row(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: 1,
    actor_id: "22222222-2222-2222-2222-222222222222",
    actor_name: "Asha",
    action: "booking.cancel",
    target_id: ID,
    details: {},
    created_at: "2026-10-19T10:00:00Z",
    ...overrides,
  };
}

describe("csvCell", () => {
  it("leaves plain text alone and null empty", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("quotes separators, quotes and line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("defuses spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("does not prefix numbers", () => {
    expect(csvCell(-5)).toBe("-5");
  });
});

describe("audit csv", () => {
  it("has a header with the seven columns", () => {
    expect(auditCsvHeader()).toBe("id,created_at,actor_id,actor_name,action,target_id,details\r\n");
  });

  it("writes one CRLF line per row with quoted JSON details", () => {
    const line = auditCsvRow(row({ details: { reason: "late" } }));
    expect(line.endsWith("\r\n")).toBe(true);
    expect(line).toContain(`,booking.cancel,${ID},"{""reason"":""late""}"`);
  });

  it("writes empty cells for a missing actor and target", () => {
    const line = auditCsvRow(row({ actor_id: null, actor_name: null, target_id: null }));
    expect(line).toBe('1,2026-10-19T10:00:00Z,,,booking.cancel,,{}\r\n');
  });

  it("defuses a formula typed as an actor name", () => {
    expect(auditCsvRow(row({ actor_name: "=HYPERLINK(x)" }))).toContain("'=HYPERLINK(x)");
  });
});

describe("details", () => {
  it("formats indented JSON", () => {
    expect(formatAuditDetails({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("knows when there is nothing to expand", () => {
    expect(hasAuditDetails({})).toBe(false);
    expect(hasAuditDetails(null)).toBe(false);
    expect(hasAuditDetails({ a: 1 })).toBe(true);
    expect(hasAuditDetails("text")).toBe(true);
  });
});

describe("auditTarget", () => {
  const all = ["users.read", "bookings.read", "rbac.manage", "applications.read", "support.read"];

  it("links a booking to its page when permitted", () => {
    const target = auditTarget(row(), all);
    expect(target).toMatchObject({ kind: "booking", href: `/bookings/${ID}`, label: "Booking abcdef12" });
  });

  it("drops the link without the page's permission", () => {
    expect(auditTarget(row(), [])?.href).toBeNull();
  });

  it("links users, applications and cases", () => {
    expect(auditTarget(row({ action: "account.status" }), all)?.href).toBe(`/users/${ID}`);
    expect(auditTarget(row({ action: "review_application" }), all)?.href).toBe(`/applications/${ID}`);
    expect(auditTarget(row({ action: "support.update" }), all)?.href).toBe(`/support/${ID}`);
  });

  it("does not link a deleted role", () => {
    expect(auditTarget(row({ action: "delete_role", details: { name: "Ops" } }), all)).toMatchObject({
      label: "Role Ops",
      href: null,
    });
    expect(auditTarget(row({ action: "update_role" }), all)?.href).toBe(`/roles/${ID}`);
  });

  it("returns an unlinked short id for unknown actions and null without a target", () => {
    expect(auditTarget(row({ action: "future.thing" }), all)).toEqual({ kind: null, label: "abcdef12", href: null });
    expect(auditTarget(row({ action: "future.thing", target_id: null }), all)).toBeNull();
  });

  it("labels an announcement by its title", () => {
    expect(
      auditTarget(row({ action: "announcement.send", target_id: null, details: { title: "Hello" } }), all)?.label,
    ).toBe("Announcement: Hello");
  });

  it("labels a gym price row as the gym and links to its page with gyms.read", () => {
    const priced = row({
      action: "gym.service_price",
      details: { service_id: "s1", title: "Personal training", ask: 1400, from: null, to: 700 },
    });
    expect(auditTarget(priced, [...all, "gyms.read"])).toEqual({
      kind: "gym",
      label: "Gym abcdef12",
      href: `/gyms/${ID}`,
    });
    expect(auditTarget(priced, all)?.href).toBeNull();
  });

  it("names a created gym from its detail", () => {
    expect(auditTarget(row({ action: "gym.create", details: { name: "Iron Republic" } }), ["gyms.read"])).toEqual({
      kind: "gym",
      label: "Gym Iron Republic",
      href: `/gyms/${ID}`,
    });
  });

  it("points a gym manager's booking actions at the booking", () => {
    expect(auditTarget(row({ action: "gym.allot", details: { gym_id: "g1" } }), all)).toMatchObject({
      kind: "booking",
      href: `/bookings/${ID}`,
    });
  });

  it("knows a target kind for every listed action", () => {
    for (const action of AUDIT_ACTIONS) {
      expect(auditTarget(row({ action }), all)?.kind, action).not.toBeNull();
    }
  });
});
