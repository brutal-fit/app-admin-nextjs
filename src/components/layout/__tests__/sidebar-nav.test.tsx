import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/my-gym/requests", search: "gym=g2" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { SidebarNav, navHref } from "@/components/layout/sidebar-nav";

const ITEMS = [
  { href: "/bookings", label: "Bookings" },
  { href: "/my-gym", label: "Overview", section: "My gym" },
  { href: "/my-gym/requests", label: "Requests", section: "My gym" },
  { href: "/my-gym/staff", label: "Staff", section: "My gym" },
];

beforeEach(() => {
  nav.pathname = "/my-gym/requests";
  nav.search = "gym=g2";
});
afterEach(cleanup);

function hrefOf(name: string): string | null {
  return screen.getByRole("link", { name }).getAttribute("href");
}

describe("SidebarNav", () => {
  it("keeps ?gym= on the my-gym links for a manager of several gyms", () => {
    render(<SidebarNav items={ITEMS} keepGym />);
    expect(hrefOf("Overview")).toBe("/my-gym?gym=g2");
    expect(hrefOf("Requests")).toBe("/my-gym/requests?gym=g2");
    expect(hrefOf("Staff")).toBe("/my-gym/staff?gym=g2");
    expect(hrefOf("Bookings")).toBe("/bookings");
  });

  it("still marks the current page while carrying the gym", () => {
    render(<SidebarNav items={ITEMS} keepGym />);
    expect(screen.getByRole("link", { name: "Requests" }).getAttribute("aria-current")).toBe("page");
  });

  it("leaves the links plain for a manager of one gym", () => {
    render(<SidebarNav items={ITEMS} />);
    expect(hrefOf("Staff")).toBe("/my-gym/staff");
  });

  it("leaves the links plain when no gym is chosen", () => {
    nav.search = "";
    render(<SidebarNav items={ITEMS} keepGym />);
    expect(hrefOf("Staff")).toBe("/my-gym/staff");
  });
});

describe("navHref", () => {
  it("encodes the gym and touches only gym pages", () => {
    expect(navHref("/my-gym/bookings", "a b", true)).toBe("/my-gym/bookings?gym=a%20b");
    expect(navHref("/my-gymnastics", "g", true)).toBe("/my-gymnastics");
    expect(navHref("/gyms", "g", true)).toBe("/gyms");
  });
});
