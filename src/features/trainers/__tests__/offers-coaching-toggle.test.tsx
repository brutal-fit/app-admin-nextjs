import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setOffersCoachingAction: vi.fn(), showToast: vi.fn() }));

vi.mock("@/features/trainers/actions", () => ({ setOffersCoachingAction: mocks.setOffersCoachingAction }));
vi.mock("@/stores/toast-store", () => ({ showToast: mocks.showToast }));

import { OffersCoachingToggle } from "@/features/trainers/components/offers-coaching-toggle";

const TRAINER = "d1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

describe("OffersCoachingToggle", () => {
  it("shows the stored value and calls the trainer profile action when switched on", async () => {
    mocks.setOffersCoachingAction.mockResolvedValue({ ok: true, data: undefined });
    render(<OffersCoachingToggle trainerId={TRAINER} trainerName="Rahul Verma" offersCoaching={false} />);
    const toggle = screen.getByRole("switch", { name: "Offers coaching" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(mocks.setOffersCoachingAction).toHaveBeenCalledWith({ trainerId: TRAINER, offersCoaching: true }),
    );
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith("success", "Rahul Verma can now be picked as a coach."),
    );
    // No optimistic state: the switch moves only when the page re-reads the profile.
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("shows the server's refusal", async () => {
    mocks.setOffersCoachingAction.mockResolvedValue({
      ok: false,
      error: { code: "BRVAL", message: "Offers coaching must be true or false." },
    });
    render(<OffersCoachingToggle trainerId={TRAINER} trainerName="Rahul Verma" offersCoaching />);
    fireEvent.click(screen.getByRole("switch", { name: "Offers coaching" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Offers coaching must be true or false.");
  });
});
