import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { reviewApplicationAction, showToast } = vi.hoisted(() => ({
  reviewApplicationAction: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/features/applications/actions", () => ({ reviewApplicationAction }));
vi.mock("@/stores/toast-store", () => ({ showToast }));

import { DecisionForm } from "@/features/applications/components/decision-form";
import type { SessionMode } from "@/types/database";

// Radix select and checkbox measure themselves; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const TRAINER = "11111111-1111-4111-8111-111111111111";

function renderForm(modes: SessionMode[], currentStatus: "approved" | "submitted" = "approved") {
  return render(
    <DecisionForm
      trainerId={TRAINER}
      currentStatus={currentStatus}
      modes={modes}
      expectedHomeRateInr={1500}
      expectedOnlineRateInr={null}
    />,
  );
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
}

beforeEach(() => {
  reviewApplicationAction.mockReset();
  showToast.mockReset();
  reviewApplicationAction.mockResolvedValue({ ok: true, data: undefined });
});
afterEach(cleanup);

describe("DecisionForm", () => {
  it("shows price inputs only for offered modes with the expected rate", () => {
    renderForm(["home"]);
    expect(screen.getByLabelText("Home price")).toBeTruthy();
    expect(screen.queryByLabelText("Online price")).toBeNull();
    expect(screen.getByText("Expected by the trainer: INR 1,500")).toBeTruthy();
  });

  it("blocks approving without a price for an offered mode", async () => {
    renderForm(["home", "online"]);
    fireEvent.change(screen.getByLabelText("Home price"), { target: { value: "1400" } });
    submit();
    expect((await screen.findByRole("alert")).textContent).toMatch(/online sessions/);
    expect(reviewApplicationAction).not.toHaveBeenCalled();
  });

  it("blocks a decision when nothing is chosen", async () => {
    renderForm(["home"], "submitted");
    submit();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Choose a decision/);
    expect(reviewApplicationAction).not.toHaveBeenCalled();
  });

  it("submits prices and checks and toasts on success", async () => {
    renderForm(["home", "online"]);
    fireEvent.change(screen.getByLabelText("Home price"), { target: { value: "1400" } });
    fireEvent.change(screen.getByLabelText("Online price"), { target: { value: "900" } });
    fireEvent.click(screen.getByLabelText("Government ID"));
    submit();
    await waitFor(() => expect(reviewApplicationAction).toHaveBeenCalledTimes(1));
    expect(reviewApplicationAction).toHaveBeenCalledWith({
      trainerId: TRAINER,
      status: "approved",
      note: "",
      homeRateInr: 1400,
      onlineRateInr: 900,
      verifiedChecks: ["government_id"],
    });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("success", "Decision saved."));
  });

  it("shows the server error when the action fails", async () => {
    reviewApplicationAction.mockResolvedValue({
      ok: false,
      error: { code: "BRPRM", message: "You do not have permission." },
    });
    renderForm(["home"]);
    fireEvent.change(screen.getByLabelText("Home price"), { target: { value: "1400" } });
    submit();
    expect((await screen.findByRole("alert")).textContent).toBe("You do not have permission.");
    expect(showToast).toHaveBeenCalledWith("error", "You do not have permission.");
  });
});
