import { describe, expect, it } from "vitest";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_SEARCH_MAX,
  EMPTY_AUDIT_FILTERS,
  auditActionLabel,
  auditRowLabel,
  auditExportFileName,
  auditExportHref,
  auditListHref,
  hasAuditFilters,
  invalidAuditRange,
  parseAuditFilters,
} from "@/features/audit/schemas";

const ID = "11111111-1111-1111-1111-111111111111";

describe("parseAuditFilters", () => {
  it("returns the empty filters for no params", () => {
    expect(parseAuditFilters({})).toEqual(EMPTY_AUDIT_FILTERS);
  });

  it("reads every filter", () => {
    const filters = parseAuditFilters({
      actor: ID,
      action: "booking.cancel",
      target: ID,
      from: "2026-10-01",
      to: "2026-10-19",
      q: " refund ",
      page: "3",
    });
    expect(filters).toEqual({
      actorId: ID,
      action: "booking.cancel",
      targetId: ID,
      from: "2026-10-01",
      to: "2026-10-19",
      search: "refund",
      page: 3,
    });
  });

  it("drops malformed values", () => {
    const filters = parseAuditFilters({
      actor: "nope",
      action: "DROP TABLE",
      target: "x",
      from: "2026-02-30",
      to: "tomorrow",
      page: "-2",
    });
    expect(filters).toEqual(EMPTY_AUDIT_FILTERS);
  });

  it("keeps an action the panel does not list", () => {
    expect(parseAuditFilters({ action: "future.thing" }).action).toBe("future.thing");
  });

  it("takes the first of repeated params and caps the search", () => {
    const filters = parseAuditFilters({ action: ["create_role", "delete_role"], q: "a".repeat(500) });
    expect(filters.action).toBe("create_role");
    expect(filters.search).toHaveLength(AUDIT_SEARCH_MAX);
  });

  it("treats a non-integer page as 1", () => {
    expect(parseAuditFilters({ page: "2.5" }).page).toBe(1);
    expect(parseAuditFilters({ page: "abc" }).page).toBe(1);
  });
});

describe("auditListHref", () => {
  it("round-trips filters through the URL", () => {
    const filters = {
      actorId: ID,
      action: "account.status",
      targetId: ID,
      from: "2026-10-01",
      to: "2026-10-19",
      search: "needs review",
      page: 2,
    };
    const href = auditListHref(filters, { page: 2 });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseAuditFilters(params)).toEqual(filters);
  });

  it("is plain /audit without filters", () => {
    expect(auditListHref(EMPTY_AUDIT_FILTERS)).toBe("/audit");
  });

  it("returns to page 1 when a filter changes", () => {
    const href = auditListHref({ ...EMPTY_AUDIT_FILTERS, page: 4 }, { action: "create_role" });
    expect(href).toBe("/audit?action=create_role");
  });
});

describe("auditExportHref", () => {
  it("carries the filters and leaves the page out", () => {
    const href = auditExportHref({ ...EMPTY_AUDIT_FILTERS, action: "create_role", page: 5 });
    expect(href).toBe("/api/audit/export?action=create_role");
  });

  it("is the bare route without filters", () => {
    expect(auditExportHref(EMPTY_AUDIT_FILTERS)).toBe("/api/audit/export");
  });
});

describe("helpers", () => {
  it("detects active filters", () => {
    expect(hasAuditFilters(EMPTY_AUDIT_FILTERS)).toBe(false);
    expect(hasAuditFilters({ ...EMPTY_AUDIT_FILTERS, search: "x" })).toBe(true);
    expect(hasAuditFilters({ ...EMPTY_AUDIT_FILTERS, page: 3 })).toBe(false);
  });

  it("flags an inverted range only", () => {
    expect(invalidAuditRange({ from: "2026-10-05", to: "2026-10-01" })).toBe(true);
    expect(invalidAuditRange({ from: "2026-10-01", to: "2026-10-01" })).toBe(false);
    expect(invalidAuditRange({ from: null, to: "2026-10-01" })).toBe(false);
  });

  it("names the export file audit-<from>-<to>.csv", () => {
    expect(auditExportFileName({ from: "2026-10-01", to: "2026-10-19" }, "2026-10-20")).toBe(
      "audit-2026-10-01-2026-10-19.csv",
    );
    expect(auditExportFileName({ from: null, to: null }, "2026-10-20")).toBe("audit-start-2026-10-20.csv");
  });

  it("labels every listed action and passes unknown ones through", () => {
    for (const action of AUDIT_ACTIONS) expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
    expect(auditActionLabel("create_role")).toBe("Role created");
    expect(auditActionLabel("mystery.action")).toBe("mystery.action");
  });
});

describe("gym actions and row labels", () => {
  it("lists and labels the gym actions the backend writes", () => {
    for (const action of [
      "gym.create",
      "gym.verify",
      "gym.listed",
      "gym.service_price",
      "gym.allot",
      "gym.decline",
      "gym.reassign",
    ]) {
      expect(AUDIT_ACTIONS as readonly string[]).toContain(action);
      expect(auditActionLabel(action)).not.toBe(action);
    }
    expect(auditActionLabel("gym.service_price")).toBe("Gym service price set");
  });

  it("reads a trainer listing toggle as listed or unlisted", () => {
    const toggle = (published: boolean) => ({
      action: "trainer.update",
      details: { keys: ["published"], from: { published: !published }, to: { published } },
    });
    expect(auditRowLabel(toggle(false))).toBe("Trainer unlisted");
    expect(auditRowLabel(toggle(true))).toBe("Trainer listed");
  });

  it("keeps the edit label when more than the listing changed", () => {
    expect(
      auditRowLabel({
        action: "trainer.update",
        details: { keys: ["bio", "published"], from: {}, to: { bio: "x", published: true } },
      }),
    ).toBe("Trainer profile edited");
    expect(auditRowLabel({ action: "trainer.update", details: { keys: ["bio"] } })).toBe("Trainer profile edited");
    expect(auditRowLabel({ action: "trainer.update", details: null })).toBe("Trainer profile edited");
  });

  it("reads gym listing and verification from their detail", () => {
    expect(auditRowLabel({ action: "gym.listed", details: { listed: true } })).toBe("Gym listed");
    expect(auditRowLabel({ action: "gym.listed", details: { listed: false } })).toBe("Gym unlisted");
    expect(auditRowLabel({ action: "gym.listed", details: {} })).toBe("Gym listing changed");
    expect(auditRowLabel({ action: "gym.verify", details: { decision: "verified" } })).toBe("Gym verified");
    expect(auditRowLabel({ action: "gym.verify", details: { decision: "suspended" } })).toBe("Gym suspended");
    expect(auditRowLabel({ action: "gym.verify", details: { decision: "odd" } })).toBe("Gym status changed");
  });

  it("falls back to the action label, or the raw action when unknown", () => {
    expect(auditRowLabel({ action: "booking.cancel", details: {} })).toBe("Booking cancelled");
    expect(auditRowLabel({ action: "mystery.action", details: {} })).toBe("mystery.action");
  });
});
