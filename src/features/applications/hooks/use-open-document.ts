"use client";

import { useState } from "react";
import { openDocumentAction } from "@/features/applications/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Opens a trainer document through a five-minute signed link (documents.review). The tab is
 * opened inside the click so popup blockers allow it, and gets the link once the server
 * returns one.
 */
export function useOpenDocument(): { opening: boolean; open: (documentId: string) => Promise<void> } {
  const [opening, setOpening] = useState(false);

  async function open(documentId: string) {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setOpening(true);
    const result = await openDocumentAction({ documentId });
    setOpening(false);
    if (!result.ok) {
      tab?.close();
      showToast("error", result.error.message);
      return;
    }
    if (tab) tab.location.href = result.data.url;
    else showToast("error", "The browser blocked the new tab. Allow pop-ups for this site.");
  }

  return { opening, open };
}
