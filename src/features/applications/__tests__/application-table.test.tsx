import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicationTable } from "@/features/applications/components/application-table";
import type { ApplicationListItem } from "@/features/applications/api";

afterEach(cleanup);

function row(overrides: Partial<ApplicationListItem>): ApplicationListItem {
  return {
    trainerId: "t1",
    fullName: "Ravi Kumar",
    username: "ravi",
    city: "Hyderabad",
    modes: ["home", "online"],
    submittedAt: "2026-10-10T06:30:00Z",
    status: "submitted",
    ...overrides,
  };
}

describe("ApplicationTable", () => {
  it("renders every filter chip and marks the active one", () => {
    render(<ApplicationTable rows={[]} filter="approved" usernamesVisible />);
    const nav = screen.getByRole("navigation", { name: "Filter by status" });
    expect(nav.querySelectorAll("a").length).toBe(7);
    expect(screen.getByRole("link", { name: "Approved" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "All" }).getAttribute("href")).toBe("/applications");
    expect(screen.getByRole("link", { name: "Needs information" }).getAttribute("href")).toBe(
      "/applications?status=needs_information",
    );
  });

  it("shows the empty state", () => {
    render(<ApplicationTable rows={[]} filter="rejected" usernamesVisible />);
    expect(screen.getByText("No applications")).toBeTruthy();
    expect(screen.getByText(/rejected right now/)).toBeTruthy();
  });

  it("renders a row with link, username, city, modes and status", () => {
    render(<ApplicationTable rows={[row({})]} filter="all" usernamesVisible />);
    expect(screen.getByRole("link", { name: "Ravi Kumar" }).getAttribute("href")).toBe(
      "/applications/t1",
    );
    expect(screen.getByText("@ravi")).toBeTruthy();
    expect(screen.getByText("Hyderabad")).toBeTruthy();
    expect(screen.getByText("Home, Online")).toBeTruthy();
    expect(screen.getByText("Submitted", { selector: "[data-slot=badge]" })).toBeTruthy();
  });

  it("says usernames are hidden when the session cannot see them", () => {
    render(
      <ApplicationTable rows={[row({ username: undefined })]} filter="all" usernamesVisible={false} />,
    );
    expect(screen.getByText("Hidden")).toBeTruthy();
    expect(screen.getByText(/Usernames are hidden/)).toBeTruthy();
  });

  it("notes truncation", () => {
    render(<ApplicationTable rows={[row({})]} filter="all" usernamesVisible truncated />);
    expect(screen.getByText(/most recent applications/)).toBeTruthy();
  });
});
