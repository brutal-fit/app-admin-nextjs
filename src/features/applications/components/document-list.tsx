"use client";

import { useState } from "react";
import { ExternalLink, FileText } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { openDocumentAction } from "@/features/applications/actions";
import { DocumentVerdictDialog } from "@/features/applications/components/document-verdict-dialog";
import { documentStatusTone, formatBytes } from "@/features/applications/format";
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS } from "@/features/applications/schemas";
import { showToast } from "@/stores/toast-store";
import type { TrainerDocumentRow } from "@/types/database";

export type DocumentListItem = Pick<
  TrainerDocumentRow,
  "id" | "kind" | "file_name" | "size_bytes" | "status" | "note"
>;

/**
 * The trainer's documents with Open (a five-minute signed link) and per-document verdicts.
 * Gated by documents.review, which is also what the table and bucket policies check.
 */
export function DocumentList({ documents }: { documents: DocumentListItem[] }) {
  const [opening, setOpening] = useState<string | null>(null);

  async function open(item: DocumentListItem) {
    // The tab is opened inside the click so popup blockers allow it; it gets the signed link
    // once the server returns one.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setOpening(item.id);
    const result = await openDocumentAction({ documentId: item.id });
    setOpening(null);
    if (!result.ok) {
      tab?.close();
      showToast("error", result.error.message);
      return;
    }
    if (tab) tab.location.href = result.data.url;
    else showToast("error", "The browser blocked the new tab. Allow pop-ups for this site.");
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents"
        description="The trainer has not uploaded any documents."
      />
    );
  }

  return (
    <ul className="flex max-w-3xl flex-col divide-y rounded-lg border bg-card">
      {documents.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">{DOCUMENT_KIND_LABELS[item.kind]}</span>
              <span className="break-all text-sm">{item.file_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(item.size_bytes)}
              </span>
            </div>
            <Badge variant="outline" className={documentStatusTone(item.status)}>
              {DOCUMENT_STATUS_LABELS[item.status]}
            </Badge>
          </div>
          {item.note ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note: </span>
              {item.note}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={opening === item.id}
              onClick={() => void open(item)}
              aria-label={`Open ${item.file_name} in a new tab`}
            >
              <ExternalLink size={16} aria-hidden="true" />
              {opening === item.id ? "Opening..." : "Open"}
            </Button>
            <DocumentVerdictDialog
              documentId={item.id}
              fileName={item.file_name}
              verdict="accepted"
              disabled={item.status === "accepted"}
            />
            <DocumentVerdictDialog
              documentId={item.id}
              fileName={item.file_name}
              verdict="rejected"
              disabled={item.status === "rejected"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
