import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { estimateRecipientsAction, sendAnnouncementAction, listUsersAction, showToast } = vi.hoisted(
  () => ({
    estimateRecipientsAction: vi.fn(),
    sendAnnouncementAction: vi.fn(),
    listUsersAction: vi.fn(),
    showToast: vi.fn(),
  }),
);

vi.mock("@/features/announcements/actions", () => ({ estimateRecipientsAction, sendAnnouncementAction }));
vi.mock("@/features/users/actions", () => ({ listUsersAction }));
vi.mock("@/stores/toast-store", () => ({ showToast }));

import type { PushStatus } from "@/features/announcements/api";
import { AnnouncementComposer } from "@/features/announcements/components/announcement-composer";

// Radix select measures itself; jsdom cannot.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function renderComposer(push: PushStatus) {
  render(
    <AnnouncementComposer
      cities={[]}
      citiesError={null}
      canSearchUsers={false}
      searchUsersReason="Sending to one person needs users.read."
      push={push}
    />,
  );
}

beforeEach(() => {
  estimateRecipientsAction.mockReset();
  estimateRecipientsAction.mockResolvedValue({ ok: true, data: { count: 3 } });
});
afterEach(cleanup);

describe("AnnouncementComposer push line", () => {
  it("says the announcement also reaches phones when push.enabled is on", () => {
    renderComposer({ ok: true, enabled: true });
    expect(screen.getByText("Also delivered as a push notification to phones.")).toBeTruthy();
    expect(screen.queryByText("Push is off in Settings.")).toBeNull();
  });

  it("says push is off when push.enabled is off", () => {
    renderComposer({ ok: true, enabled: false });
    expect(screen.getByText("Push is off in Settings.")).toBeTruthy();
    expect(screen.queryByText("Also delivered as a push notification to phones.")).toBeNull();
  });

  it("says the setting could not be read instead of guessing", () => {
    renderComposer({ ok: false, error: "Network error." });
    expect(screen.getByText("Whether push is on could not be read: Network error.")).toBeTruthy();
  });
});
