import { describe, expect, it } from "vitest";
import {
  decisionPlan,
  deriveReview,
  parsePriceInput,
  reviewHistoryFromAudit,
  type ReviewDocument,
  type ReviewHistory,
} from "@/features/applications/review-state";
import type { ApplicationStatus, DocumentKind, DocumentStatus } from "@/types/database";

function doc(
  id: string,
  kind: DocumentKind,
  status: DocumentStatus,
  createdAt = "2026-10-20T10:00:00Z",
): ReviewDocument {
  return { id, kind, status, file_name: `${id}.pdf`, size_bytes: 2048, note: null, created_at: createdAt };
}

function review(
  status: ApplicationStatus,
  documents: ReviewDocument[] | null,
  history: ReviewHistory | null = null,
) {
  return deriveReview({
    status,
    submittedAt: "2026-10-20T10:05:00Z",
    updatedAt: "2026-10-21T09:00:00Z",
    documents,
    history,
  });
}

const stepKeys = (state: ReturnType<typeof review>) => state.steps.map((step) => step.key);
const current = (state: ReturnType<typeof review>) =>
  state.steps.find((step) => step.state === "current")?.key ?? null;

describe("reviewHistoryFromAudit", () => {
  it("reads the start, the waits, the rejected kinds and the decision", () => {
    const history = reviewHistoryFromAudit([
      { action: "review_application", details: { status: "approved" }, created_at: "2026-10-24T10:00:00Z" },
      { action: "trainer.review_start", details: {}, created_at: "2026-10-21T10:00:00Z" },
      {
        action: "document.review",
        details: { kind: "government_id", status: "rejected" },
        created_at: "2026-10-21T10:01:00Z",
      },
      { action: "document.review", details: { kind: "certificate", status: "accepted" }, created_at: "2026-10-21T10:00:30Z" },
      {
        action: "trainer.request_documents",
        details: { kinds: ["certificate"] },
        created_at: "2026-10-22T08:00:00Z",
      },
      { action: "user.update", details: {}, created_at: "2026-10-01T00:00:00Z" },
    ]);
    expect(history).toEqual({
      reviewStartedAt: "2026-10-21T10:00:00Z",
      waitingTimes: ["2026-10-21T10:01:00Z", "2026-10-22T08:00:00Z"],
      rejectedAt: { government_id: "2026-10-21T10:01:00Z", certificate: "2026-10-22T08:00:00Z" },
      decidedAt: "2026-10-24T10:00:00Z",
    });
  });

  it("counts a manual needs-information decision as a wait and ignores odd details", () => {
    const history = reviewHistoryFromAudit([
      { action: "review_application", details: { status: "needs_information" }, created_at: "2026-10-22T00:00:00Z" },
      { action: "document.review", details: null, created_at: "2026-10-21T00:00:00Z" },
    ]);
    expect(history.waitingTimes).toEqual(["2026-10-22T00:00:00Z"]);
    expect(history.reviewStartedAt).toBe("2026-10-21T00:00:00Z");
    expect(history.decidedAt).toBeNull();
  });
});

describe("deriveReview", () => {
  it("all waiting: nothing missing or rejected, review not started", () => {
    const state = review("submitted", [doc("a", "government_id", "uploaded"), doc("b", "certificate", "uploaded")]);
    expect(state.required.map((row) => row.state)).toEqual(["waiting", "waiting"]);
    expect(state.attention).toHaveLength(2);
    expect(state.askKinds).toEqual([]);
    expect(stepKeys(state)).toEqual(["submitted", "reviewing", "decided"]);
    expect(current(state)).toBe("submitted");
    expect(state.resubmitted).toBe(false);
  });

  it("lights Reviewing from the first verdict and marks a missing kind", () => {
    const state = review("under_review", [doc("a", "government_id", "accepted")]);
    expect(state.required.map((row) => row.state)).toEqual(["accepted", "missing"]);
    expect(state.acceptedCount).toBe(1);
    expect(state.askKinds).toEqual(["certificate"]);
    expect(current(state)).toBe("reviewing");
    expect(state.steps[1]?.at).toBe("2026-10-21T09:00:00Z");
  });

  it("shows Waiting for documents only when it happened", () => {
    const waiting = review("needs_information", [doc("a", "government_id", "rejected")]);
    expect(stepKeys(waiting)).toEqual(["submitted", "reviewing", "waiting", "decided"]);
    expect(current(waiting)).toBe("waiting");
    expect(waiting.waitingNow).toBe(true);
    expect(waiting.waitingSince).toBe("2026-10-21T09:00:00Z");

    const approvedStraight = review("approved", [doc("a", "government_id", "accepted")]);
    expect(stepKeys(approvedStraight)).toEqual(["submitted", "reviewing", "decided"]);
    expect(approvedStraight.steps.at(-1)?.label).toBe("Approved");
    expect(current(approvedStraight)).toBe("decided");
  });

  it("prefers the accepted copy of a kind and lists the rest as extras", () => {
    const state = review("under_review", [
      doc("old", "certificate", "rejected", "2026-10-19T00:00:00Z"),
      doc("ok", "certificate", "accepted", "2026-10-20T00:00:00Z"),
      doc("x", "other", "uploaded"),
    ]);
    expect(state.required[1]?.document?.id).toBe("ok");
    expect(state.extras.map((item) => item.id)).toEqual(["old", "x"]);
  });

  it("marks a resubmission from the audit history", () => {
    const history: ReviewHistory = {
      reviewStartedAt: "2026-10-21T10:00:00Z",
      waitingTimes: ["2026-10-21T10:01:00Z"],
      rejectedAt: { certificate: "2026-10-21T10:01:00Z" },
      decidedAt: null,
    };
    const state = review(
      "submitted",
      [
        doc("id", "government_id", "accepted", "2026-10-20T00:00:00Z"),
        doc("new", "certificate", "uploaded", "2026-10-22T07:00:00Z"),
      ],
      history,
    );
    expect(state.required[1]?.state).toBe("resubmitted");
    expect(state.attention[0]?.resubmitted).toBe(true);
    expect(state.resubmitted).toBe(true);
    expect(stepKeys(state)).toContain("waiting");
    expect(state.steps.map((step) => step.state)).toEqual(["done", "done", "done", "upcoming"]);
    expect(state.steps[2]?.detail).toMatch(/^Resubmitted /);
  });

  it("infers a resubmission without history when a submitted application already has verdicts", () => {
    const state = review("submitted", [
      doc("id", "government_id", "accepted"),
      doc("new", "certificate", "uploaded"),
    ]);
    expect(state.required[1]?.state).toBe("resubmitted");
    expect(state.resubmitted).toBe(true);
    expect(stepKeys(state)).toContain("waiting");
  });

  it("hides document states without documents.review", () => {
    const state = review("submitted", null);
    expect(state.documentsVisible).toBe(false);
    expect(state.askKinds).toEqual([]);
  });

  it("leaves every step upcoming on a draft", () => {
    const state = review("draft", []);
    expect(state.steps.every((step) => step.state === "upcoming")).toBe(true);
  });
});

describe("decisionPlan", () => {
  const both = ["home", "online"] as const;

  it("asks for documents while a required one is rejected or missing", () => {
    const state = review("under_review", [doc("a", "government_id", "rejected")]);
    expect(decisionPlan(state, both, { home: "1000", online: "800" })).toEqual({
      primary: "ask",
      kinds: ["government_id", "certificate"],
    });
  });

  it("blocks Approve until both documents are accepted", () => {
    const state = review("under_review", [doc("a", "government_id", "accepted"), doc("b", "certificate", "uploaded")]);
    const plan = decisionPlan(state, both, { home: "1000", online: "800" });
    expect(plan).toMatchObject({ primary: "approve", blocker: "Accept the government ID and the certificate first." });
  });

  it("blocks Approve until every offered mode has a valid price", () => {
    const state = review("under_review", [doc("a", "government_id", "accepted"), doc("b", "certificate", "accepted")]);
    expect(decisionPlan(state, both, { home: "", online: "" })).toMatchObject({
      blocker: "Set the home and online prices to approve.",
    });
    expect(decisionPlan(state, ["online"], { home: "", online: "" })).toMatchObject({
      blocker: "Set the online price to approve.",
    });
    expect(decisionPlan(state, both, { home: "12.5", online: "800" })).toMatchObject({
      blocker: "Prices are whole rupees.",
    });
    expect(decisionPlan(state, both, { home: "1000", online: "800" })).toEqual({
      primary: "approve",
      blocker: null,
      prices: { home: 1000, online: 800 },
    });
  });

  it("only prices the offered modes", () => {
    const state = review("under_review", [doc("a", "government_id", "accepted"), doc("b", "certificate", "accepted")]);
    expect(decisionPlan(state, ["home"], { home: "1000", online: "" })).toEqual({
      primary: "approve",
      blocker: null,
      prices: { home: 1000, online: null },
    });
  });
});

describe("parsePriceInput", () => {
  it("reads blank as no price and checks the range", () => {
    expect(parsePriceInput(" ")).toEqual({ value: null, error: null });
    expect(parsePriceInput("1200")).toEqual({ value: 1200, error: null });
    expect(parsePriceInput("0").error).toMatch(/start at/);
    expect(parsePriceInput("100001").error).toMatch(/stop at/);
  });
});
