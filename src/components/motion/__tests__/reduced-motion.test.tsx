import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountUp } from "@/components/motion/count-up";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

type Listener = () => void;

function mockMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, fn: Listener) => listeners.add(fn),
      removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
    })),
  );
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((fn) => fn());
    },
  };
}

function Probe() {
  return <span data-testid="flag">{String(usePrefersReducedMotion())}</span>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("usePrefersReducedMotion", () => {
  it("reads the media query", () => {
    mockMedia(true);
    render(<Probe />);
    expect(screen.getByTestId("flag").textContent).toBe("true");
  });

  it("follows a live change without a reload", () => {
    const media = mockMedia(false);
    render(<Probe />);
    expect(screen.getByTestId("flag").textContent).toBe("false");
    act(() => media.set(true));
    expect(screen.getByTestId("flag").textContent).toBe("true");
  });
});

describe("CountUp", () => {
  it("renders the final value immediately under reduced motion", () => {
    mockMedia(true);
    const { container } = render(<CountUp value={1234} suffix="+" />);
    expect(container.querySelector("[data-count-up]")?.textContent).toBe("1,234");
    expect(container.querySelector(".sr-only")?.textContent).toBe("1,234+");
  });

  it("always carries the real value for screen readers", () => {
    mockMedia(false);
    const { container } = render(<CountUp value={42} />);
    expect(container.querySelector(".sr-only")?.textContent).toBe("42");
  });
});
