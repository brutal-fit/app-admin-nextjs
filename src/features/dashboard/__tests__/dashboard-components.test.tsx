import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { ReviewQueue } from "@/features/dashboard/components/review-queue";
import { StatTiles } from "@/features/dashboard/components/stat-tiles";
import type { DashboardTile } from "@/features/dashboard/api";

afterEach(cleanup);

function tile(overrides: Partial<DashboardTile>): DashboardTile {
  return {
    id: "applications",
    label: "Applications",
    hint: "Waiting for review.",
    href: "/applications?status=awaiting_review",
    urgent: true,
    value: { kind: "count", value: 3, detail: "2 submitted, 1 under review." },
    ...overrides,
  };
}

describe("StatTiles", () => {
  it("links a counted tile to its filtered page and flags urgent work", () => {
    render(<StatTiles tiles={[tile({})]} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/applications?status=awaiting_review");
    expect(link.getAttribute("data-tile")).toBe("applications");
    expect(screen.getByText("Needs attention")).toBeTruthy();
    expect(screen.getByText("2 submitted, 1 under review.")).toBeTruthy();
  });

  it("does not flag a zero count", () => {
    render(<StatTiles tiles={[tile({ value: { kind: "count", value: 0 } })]} />);
    expect(screen.queryByText("Needs attention")).toBeNull();
  });

  it("shows the capped marker", () => {
    const { container } = render(
      <StatTiles tiles={[tile({ value: { kind: "count", value: 200, capped: true } })]} />,
    );
    expect(container.querySelector(".sr-only")?.textContent).toBe("200+");
  });

  it("explains a hidden tile instead of showing a number, and does not link it", () => {
    render(
      <StatTiles
        tiles={[tile({ id: "support", label: "Support", value: { kind: "hidden", reason: "Needs the Support permission." } })]}
      />,
    );
    expect(screen.getByText("Needs the Support permission.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows an error as an alert", () => {
    render(<StatTiles tiles={[tile({ value: { kind: "error", message: "Query failed." } })]} />);
    expect(screen.getByRole("alert").textContent).toBe("Query failed.");
  });

  it("shows the link note when the tile has no page", () => {
    render(<StatTiles tiles={[tile({ id: "new-users", href: null, linkNote: "No page yet." })]} />);
    expect(screen.getByText("No page yet.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("ReviewQueue", () => {
  it("shows the reason when hidden", () => {
    render(<ReviewQueue result={{ kind: "hidden", reason: "The queue needs a permission." }} />);
    expect(screen.getByText("The queue needs a permission.")).toBeTruthy();
  });

  it("shows an honest empty state", () => {
    render(<ReviewQueue result={{ kind: "ok", items: [] }} />);
    expect(screen.getByText("Nothing is waiting")).toBeTruthy();
    expect(screen.queryByText("See all")).toBeNull();
  });

  it("shows errors as an alert", () => {
    render(<ReviewQueue result={{ kind: "error", message: "Boom." }} />);
    expect(screen.getByRole("alert").textContent).toBe("Boom.");
  });
});

describe("ActivityFeed", () => {
  it("shows hidden, coming and error states", () => {
    const { rerender } = render(<ActivityFeed result={{ kind: "hidden", reason: "Needs audit." }} />);
    expect(screen.getByText("Needs audit.")).toBeTruthy();
    rerender(<ActivityFeed result={{ kind: "coming", reason: "Later." }} />);
    expect(screen.getByText("Coming soon")).toBeTruthy();
    rerender(<ActivityFeed result={{ kind: "error", message: "Bad." }} />);
    expect(screen.getByRole("alert").textContent).toBe("Bad.");
  });

  it("shows an empty state", () => {
    render(<ActivityFeed result={{ kind: "ok", items: [] }} />);
    expect(screen.getByText("No activity yet")).toBeTruthy();
  });

  it("is a labelled region", () => {
    render(<ActivityFeed result={{ kind: "ok", items: [] }} />);
    const region = screen.getByRole("region", { name: "Activity" });
    expect(within(region).getByText("Latest admin actions, newest first.")).toBeTruthy();
  });
});
