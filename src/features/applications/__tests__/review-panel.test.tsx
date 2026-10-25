import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reviewApplicationAction: vi.fn(),
  reviewDocumentAction: vi.fn(),
  openDocumentAction: vi.fn(),
  requestDocumentsAction: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/features/applications/actions", () => ({
  reviewApplicationAction: mocks.reviewApplicationAction,
  reviewDocumentAction: mocks.reviewDocumentAction,
  openDocumentAction: mocks.openDocumentAction,
}));
vi.mock("@/features/trainers/actions", () => ({ requestDocumentsAction: mocks.requestDocumentsAction }));
vi.mock("@/stores/toast-store", () => ({ showToast: mocks.showToast }));

import { ReviewPanel, type ReviewPanelApplication } from "@/features/applications/components/review-panel";
import type { ReviewDocument } from "@/features/applications/review-state";
import type { ApplicationStatus, DocumentKind, DocumentStatus } from "@/types/database";

// Radix popover and switch measure themselves; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const TRAINER = "11111111-1111-4111-8111-111111111111";
const ID_DOC = "22222222-2222-4222-8222-222222222222";
const CERT_DOC = "33333333-3333-4333-8333-333333333333";

function application(
  status: ApplicationStatus,
  bids: { home: number | null; online: number | null } = { home: 1000, online: 700 },
): ReviewPanelApplication {
  return {
    trainer_id: TRAINER,
    full_name: "Ravi Kumar",
    status,
    modes: ["home", "online"],
    expected_home_rate_inr: bids.home,
    expected_online_rate_inr: bids.online,
    submitted_at: "2026-10-20T10:05:00Z",
    updated_at: "2026-10-21T09:00:00Z",
    reviewer_note: status === "rejected" ? "Not a fit yet." : null,
  };
}

function doc(id: string, kind: DocumentKind, status: DocumentStatus): ReviewDocument {
  return { id, kind, status, file_name: `${kind}.pdf`, size_bytes: 4096, note: null, created_at: "2026-10-20T10:00:00Z" };
}

function renderPanel(
  status: ApplicationStatus,
  documents: ReviewDocument[] | null,
  options: { bids?: { home: number | null; online: number | null }; canDecide?: boolean } = {},
) {
  return render(
    <ReviewPanel
      application={application(status, options.bids)}
      documents={documents}
      history={null}
      canDecide={options.canDecide ?? true}
      trainerHref={`/trainers/${TRAINER}`}
    />,
  );
}

const strip = () => screen.getByRole("list", { name: "Review progress" });
const approveButton = () => screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement;

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.reviewApplicationAction.mockResolvedValue({ ok: true, data: undefined });
  mocks.reviewDocumentAction.mockResolvedValue({ ok: true, data: undefined });
  mocks.requestDocumentsAction.mockResolvedValue({ ok: true, data: undefined });
});
afterEach(cleanup);

describe("ReviewPanel progression", () => {
  it("all waiting: documents need attention and Approve waits for them", () => {
    renderPanel("submitted", [doc(ID_DOC, "government_id", "uploaded"), doc(CERT_DOC, "certificate", "uploaded")]);
    expect(screen.getByRole("heading", { name: "Needs your attention" })).toBeTruthy();
    expect(screen.getByText("0 of 2 accepted")).toBeTruthy();
    expect(approveButton().disabled).toBe(true);
    expect(screen.getByText("Accept the government ID and the certificate first.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ask for documents" })).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("one rejected: Ask for documents is the primary action", () => {
    renderPanel("needs_information", [
      doc(ID_DOC, "government_id", "rejected"),
      doc(CERT_DOC, "certificate", "accepted"),
    ]);
    expect(screen.getByRole("button", { name: "Ask for documents" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByText(/Waiting for the trainer since/)).toBeTruthy();
    expect(screen.getByText("Government ID needs a new upload before you can approve.")).toBeTruthy();
  });

  it("Ask for documents opens the request dialog with the rejected kinds ticked", () => {
    renderPanel("under_review", [doc(CERT_DOC, "certificate", "accepted")]);
    fireEvent.click(screen.getByRole("button", { name: "Ask for documents" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("checkbox", { name: "Government ID" }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByRole("checkbox", { name: "Certificate" }).getAttribute("aria-checked")).toBe("false");
  });

  it("both accepted without prices: Approve disabled with the hint", () => {
    renderPanel(
      "under_review",
      [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "accepted")],
      { bids: { home: null, online: null } },
    );
    expect(screen.getByText("2 of 2 accepted")).toBeTruthy();
    expect(approveButton().disabled).toBe(true);
    expect(screen.getByText("Set the home and online prices to approve.")).toBeTruthy();
    expect(screen.getAllByText("No bid")).toHaveLength(2);
  });

  it("both accepted with prices: Approve enabled, prices pre-filled from the bids", () => {
    renderPanel("under_review", [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "accepted")]);
    expect((screen.getByLabelText("Home price") as HTMLInputElement).value).toBe("1000");
    expect(screen.getByText("asked INR 1,000")).toBeTruthy();
    expect(approveButton().disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("Online price"), { target: { value: "" } });
    expect(approveButton().disabled).toBe(true);
    expect(screen.getByText("Set the online price to approve.")).toBeTruthy();
  });

  it("ticks the ID and certificate checks when their documents are accepted", () => {
    renderPanel("under_review", [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "uploaded")]);
    expect(screen.getByRole("switch", { name: "Government ID" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Certificate" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch", { name: "Met in person" }).getAttribute("aria-checked")).toBe("false");
  });

  it("decided: a read-only summary with no decision buttons", () => {
    renderPanel("approved", [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "accepted")]);
    expect(screen.getByRole("region", { name: "Decision" }).textContent).toMatch(/Approved on /);
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject application" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Accept / })).toBeNull();
    expect(screen.queryByLabelText("Home price")).toBeNull();
    expect(screen.getByRole("link", { name: "Open the trainer page" }).getAttribute("href")).toBe(
      `/trainers/${TRAINER}`,
    );
  });

  it("says why decisions are missing without applications.review", () => {
    renderPanel("under_review", [doc(ID_DOC, "government_id", "uploaded")], { canDecide: false });
    expect(screen.getByText("Decisions need the Approve or reject applications permission.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("says why documents are missing without documents.review", () => {
    renderPanel("submitted", null);
    expect(screen.getByText("Documents need the Review documents permission.")).toBeTruthy();
  });
});

describe("ReviewPanel strip", () => {
  it("shows Waiting for documents only when that state occurred", () => {
    renderPanel("under_review", [doc(ID_DOC, "government_id", "accepted")]);
    expect(within(strip()).queryByText("Waiting for documents")).toBeNull();
    cleanup();
    renderPanel("needs_information", [doc(ID_DOC, "government_id", "rejected")]);
    expect(within(strip()).getByText("Waiting for documents")).toBeTruthy();
  });

  it("shows the resubmission banner and marks the new file", () => {
    renderPanel("submitted", [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "uploaded")]);
    expect(screen.getByRole("status").textContent).toMatch(/Documents resubmitted/);
    expect(screen.getAllByText("Resubmitted").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^New file, /).length).toBeGreaterThan(0);
  });
});

describe("ReviewPanel actions", () => {
  it("Accept calls the document review action", async () => {
    renderPanel("submitted", [doc(ID_DOC, "government_id", "uploaded")]);
    fireEvent.click(screen.getAllByRole("button", { name: "Accept government_id.pdf" })[0] as HTMLElement);
    await waitFor(() =>
      expect(mocks.reviewDocumentAction).toHaveBeenCalledWith({ documentId: ID_DOC, status: "accepted", note: "" }),
    );
  });

  it("Reject takes a note in a popover and calls the document review action", async () => {
    renderPanel("submitted", [doc(ID_DOC, "government_id", "uploaded")]);
    fireEvent.click(screen.getAllByRole("button", { name: "Reject government_id.pdf" })[0] as HTMLElement);
    fireEvent.change(await screen.findByLabelText(/What should the trainer fix/), {
      target: { value: "Blurry photo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject document" }));
    await waitFor(() =>
      expect(mocks.reviewDocumentAction).toHaveBeenCalledWith({
        documentId: ID_DOC,
        status: "rejected",
        note: "Blurry photo",
      }),
    );
  });

  it("shows a server refusal inline on the row", async () => {
    mocks.reviewDocumentAction.mockResolvedValue({
      ok: false,
      error: { code: "BRNTF", message: "Document not found." },
    });
    renderPanel("submitted", [doc(ID_DOC, "government_id", "uploaded")]);
    fireEvent.click(screen.getAllByRole("button", { name: "Accept government_id.pdf" })[0] as HTMLElement);
    expect((await screen.findByRole("alert")).textContent).toBe("Document not found.");
  });

  it("Approve confirms, then calls review with approved, the prices and the checks", async () => {
    renderPanel("under_review", [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "accepted")]);
    fireEvent.change(screen.getByLabelText("Home price"), { target: { value: "1200" } });
    fireEvent.click(approveButton());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Approve Ravi Kumar?")).toBeTruthy();
    expect(within(dialog).getByText("They go live at these prices.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve and publish" }));
    await waitFor(() =>
      expect(mocks.reviewApplicationAction).toHaveBeenCalledWith({
        trainerId: TRAINER,
        status: "approved",
        note: "",
        homeRateInr: 1200,
        onlineRateInr: 700,
        verifiedChecks: ["government_id", "certificate"],
      }),
    );
  });

  it("renders the server's approval refusal inline", async () => {
    mocks.reviewApplicationAction.mockResolvedValue({
      ok: false,
      error: { code: "BRVAL", message: "Accept the government ID and the certificate first." },
    });
    renderPanel("under_review", [doc(ID_DOC, "government_id", "accepted"), doc(CERT_DOC, "certificate", "accepted")]);
    fireEvent.click(approveButton());
    fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Accept the government ID and the certificate first.",
    );
  });

  it("Reject application needs a reason before it calls review", async () => {
    renderPanel("under_review", [doc(ID_DOC, "government_id", "uploaded")]);
    fireEvent.click(screen.getByRole("button", { name: "Reject application" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject application" }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Say why the application is rejected.");
    expect(mocks.reviewApplicationAction).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText("Reason for the trainer"), { target: { value: "Not a fit yet." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject application" }));
    await waitFor(() =>
      expect(mocks.reviewApplicationAction).toHaveBeenCalledWith(
        expect.objectContaining({ trainerId: TRAINER, status: "rejected", note: "Not a fit yet." }),
      ),
    );
  });
});
