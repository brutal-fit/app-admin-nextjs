import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BACKDROP_OPACITY, Backdrop } from "@/components/art/backdrop";

afterEach(cleanup);

describe("Backdrop", () => {
  it("is decorative: aria-hidden, no pointer events, behind content", () => {
    const { container } = render(<Backdrop />);
    const node = container.querySelector("[data-backdrop]");
    expect(node?.getAttribute("aria-hidden")).toBe("true");
    expect(node?.className).toContain("pointer-events-none");
    expect(node?.className).toContain("-z-10");
  });

  it("keeps the line art within the faint range", () => {
    expect(BACKDROP_OPACITY).toBeGreaterThanOrEqual(0.035);
    expect(BACKDROP_OPACITY).toBeLessThanOrEqual(0.05);
  });

  it("contains no focusable elements", () => {
    const { container } = render(<Backdrop />);
    expect(container.querySelectorAll("a, button, input, [tabindex]").length).toBe(0);
  });
});
