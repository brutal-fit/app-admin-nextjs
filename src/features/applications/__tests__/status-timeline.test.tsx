import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusTimeline } from "@/features/applications/components/status-timeline";
import { formatDateTime } from "@/features/applications/format";

afterEach(cleanup);

describe("StatusTimeline", () => {
  it("shows the draft first and not dated after the submission when the data disagrees", () => {
    const created = "2026-10-20T11:17:00Z";
    const submitted = "2026-10-18T11:17:00Z";
    render(
      <StatusTimeline status="under_review" createdAt={created} submittedAt={submitted} updatedAt="2026-10-21T09:00:00Z" />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("Draft");
    expect(items[1]?.textContent).toContain("Submitted");
    expect(items[0]?.textContent).toContain(`Started ${formatDateTime(submitted)}`);
    expect(screen.queryByText(new RegExp(formatDateTime(created)))).toBeNull();
    expect(items[2]?.getAttribute("aria-current")).toBe("step");
  });
});
