import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Avatar } from "@/components/avatar/avatar";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function state(container: HTMLElement) {
  return container.querySelector("[data-avatar]")?.getAttribute("data-avatar");
}

describe("Avatar", () => {
  it("shows the photo when avatar_path is set", () => {
    const { container } = render(<Avatar name="Asha Rao" avatar={{ path: "u1/a.jpg", preset: "mat" }} />);
    expect(state(container)).toBe("photo");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.supabase.co/storage/v1/object/public/avatars/u1/a.jpg",
    );
  });

  it("shows the preset svg when there is no photo", () => {
    const { container } = render(<Avatar name="Asha Rao" avatar={{ path: null, preset: "dumbbell" }} />);
    expect(state(container)).toBe("preset");
    // Exactly the relative path: an absolute URL built from the request origin is http behind
    // the preview proxy and turns https pages into mixed content.
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/avatars/dumbbell.svg");
  });

  it("keeps every preset src relative, with no scheme or host", () => {
    const { container } = render(<Avatar name="Bo" avatar={{ path: null, preset: "whistle" }} size="lg" />);
    const src = container.querySelector("img")?.getAttribute("src") ?? "";
    expect(src).toBe("/avatars/whistle.svg");
    expect(src).not.toMatch(/^[a-z]+:|^\/\//i);
  });

  it("shows initials when neither is set", () => {
    const { container } = render(<Avatar name="Asha Rao" avatar={{ path: null, preset: null }} />);
    expect(state(container)).toBe("initials");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("AR");
  });

  it("shows initials with no avatar prop and ignores an unknown preset", () => {
    expect(state(render(<Avatar name="Bo" />).container)).toBe("initials");
    cleanup();
    expect(state(render(<Avatar name="Bo" avatar={{ path: null, preset: "unicorn" }} />).container)).toBe("initials");
  });

  it("falls through photo, preset, initials when sources fail to load", () => {
    const { container } = render(<Avatar name="Asha Rao" avatar={{ path: "x.jpg", preset: "rope" }} />);
    fireEvent.error(container.querySelector("img")!);
    expect(state(container)).toBe("preset");
    fireEvent.error(container.querySelector("img")!);
    expect(state(container)).toBe("initials");
  });
});
